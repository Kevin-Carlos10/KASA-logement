from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User

from .models import ElectricityInfo, PriceHistory, Property, Quartier, WaterInfo


class PropertiesTestBase(APITestCase):
    def setUp(self):
        self.bailleur = User.objects.create_user(
            username="bailleur1", password="pass12345", phone_number="+22670000010", is_bailleur=True,
        )
        self.locataire = User.objects.create_user(
            username="locataire1", password="pass12345", phone_number="+22670000011", is_locataire=True,
        )
        self.quartier = Quartier.objects.create(nom="Gounghin", ville="Ouagadougou")

    def create_property(self, **overrides):
        payload = dict(
            type_logement="studio",
            quartier=str(self.quartier.id),
            prix="50000",
            conditions_location="Une avance de deux mois",
            latitude="12.371300",
            longitude="-1.519600",
            surface_m2="18.5",
            acces_goudron=True,
        )
        payload.update(overrides)
        self.client.force_authenticate(self.bailleur)
        url = reverse("logement-list")
        return self.client.post(url, payload, format="json")


class QuartierViewSetTests(PropertiesTestBase):
    def test_list_quartiers_public(self):
        response = self.client.get(reverse("quartier-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_create_quartier_requires_auth(self):
        response = self.client.post(
            reverse("quartier-list"), {"nom": "Tanghin", "ville": "Ouagadougou"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_quartier_authenticated(self):
        self.client.force_authenticate(self.bailleur)
        response = self.client.post(
            reverse("quartier-list"), {"nom": "Tanghin", "ville": "Ouagadougou"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


class PropertyViewSetTests(PropertiesTestBase):
    def test_create_property_sets_bailleur(self):
        response = self.create_property()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        prop = Property.objects.get(id=response.data["id"])
        self.assertEqual(prop.bailleur, self.bailleur)
        self.assertFalse(prop.is_verified)

    def test_create_property_requires_auth(self):
        url = reverse("logement-list")
        response = self.client.post(url, {"type_logement": "studio"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_properties_public_uses_light_serializer(self):
        self.create_property()
        response = self.client.get(reverse("logement-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertIn("quartier_nom", response.data["results"][0])
        self.assertNotIn("conditions_location", response.data["results"][0])

    def test_retrieve_property_uses_detail_serializer(self):
        create_resp = self.create_property()
        prop_id = create_resp.data["id"]
        response = self.client.get(reverse("logement-detail", args=[prop_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("commission_kasa_montant", response.data)
        self.assertEqual(str(response.data["commission_kasa_montant"]), "12500")

    def test_filter_by_price_range(self):
        self.create_property(prix="30000")
        self.create_property(prix="90000")
        response = self.client.get(reverse("logement-list"), {"prix__gte": 50000})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_changer_prix_journalise_historique(self):
        create_resp = self.create_property()
        prop_id = create_resp.data["id"]
        self.client.force_authenticate(self.bailleur)
        url = reverse("logement-changer-prix", args=[prop_id])
        response = self.client.patch(
            url, {"nouveau_prix": 60000, "justification": "Travaux de rénovation"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(str(response.data["prix"]), "60000")
        self.assertEqual(PriceHistory.objects.filter(property_id=prop_id).count(), 1)
        history = PriceHistory.objects.get(property_id=prop_id)
        self.assertEqual(int(history.ancien_prix), 50000)
        self.assertEqual(int(history.nouveau_prix), 60000)

    def test_proximite_search(self):
        self.create_property(latitude="12.3713", longitude="-1.5196")
        self.create_property(latitude="20.0", longitude="10.0")
        response = self.client.get(reverse("logement-proximite"), {"lat": "12.3713", "lng": "-1.5196", "rayon_km": 5})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertIn("distance_km", response.data[0])

    def test_proximite_requires_lat_lng(self):
        response = self.client.get(reverse("logement-proximite"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_distance_a_un_lieu(self):
        create_resp = self.create_property(latitude="12.3713", longitude="-1.5196")
        prop_id = create_resp.data["id"]
        url = reverse("logement-distance-a-un-lieu", args=[prop_id])
        response = self.client.get(url, {"lat": "12.3713", "lng": "-1.5196"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["distance_km"], 0.0)


class WaterElectricityInfoTests(PropertiesTestBase):
    def setUp(self):
        super().setUp()
        create_resp = self.create_property()
        self.property_id = create_resp.data["id"]

    def test_create_water_info(self):
        facture = SimpleUploadedFile("facture_onea.pdf", b"contenu-facture", content_type="application/pdf")
        payload = {
            "property": self.property_id,
            "disponible": True,
            "type_compteur": "individuel",
            "derniere_facture_onea": facture,
            "frequence_coupures": "Rare",
        }
        response = self.client.post(reverse("water-info-list"), payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(WaterInfo.objects.count(), 1)
        self.assertEqual(str(WaterInfo.objects.get().property_id), self.property_id)

    def test_create_electricity_info_cash_power(self):
        payload = {
            "property": self.property_id,
            "disponible": True,
            "type_compteur": "individuel",
            "type_alimentation": "cash_power",
            "montant_moyen_redevance": "15000",
        }
        response = self.client.post(reverse("electricity-info-list"), payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(ElectricityInfo.objects.count(), 1)

    def test_electricity_info_classique_requires_facture(self):
        payload = {
            "property": self.property_id,
            "disponible": True,
            "type_compteur": "individuel",
            "type_alimentation": "classique",
        }
        response = self.client.post(reverse("electricity-info-list"), payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MarketDataViewTests(PropertiesTestBase):
    def test_market_data_is_public(self):
        self.create_property(prix="40000")
        self.create_property(prix="60000")
        response = self.client.get(reverse("market-data-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("prix_moyen_par_zone_et_type", response.data)
        self.assertIn("evolution_prix", response.data)
        self.assertEqual(len(response.data["prix_moyen_par_zone_et_type"]), 1)
        self.assertEqual(int(response.data["prix_moyen_par_zone_et_type"][0]["prix_moyen"]), 50000)
