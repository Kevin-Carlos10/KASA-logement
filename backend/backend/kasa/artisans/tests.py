from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User

from .models import ArtisanProfile, Metier, Prestation, ServicePayment, ServiceRequest


class ArtisansTestBase(APITestCase):
    def setUp(self):
        self.locataire = User.objects.create_user(
            username="locataire1", password="pass12345", phone_number="+22670000060", is_locataire=True,
        )
        self.artisan_user_proche = User.objects.create_user(
            username="artisan_proche", password="pass12345", phone_number="+22670000061", is_artisan=True,
        )
        self.artisan_user_loin = User.objects.create_user(
            username="artisan_loin", password="pass12345", phone_number="+22670000062", is_artisan=True,
        )
        self.metier = Metier.objects.create(nom="Plombier")
        self.artisan_proche = ArtisanProfile.objects.create(
            user=self.artisan_user_proche, metier=self.metier, quartier="Gounghin",
            latitude="12.3713", longitude="-1.5196", whatsapp_number="+22670000061",
            is_verified=True, note_moyenne=4,
        )
        self.artisan_loin = ArtisanProfile.objects.create(
            user=self.artisan_user_loin, metier=self.metier, quartier="Ailleurs",
            latitude="20.0", longitude="10.0", whatsapp_number="+22670000062",
            is_verified=True, note_moyenne=5,
        )
        self.prestation = Prestation.objects.create(
            metier=self.metier, nom="Réparation fuite", type_tarification="forfait", prix_reference=5000,
        )


class MetierPrestationTests(ArtisansTestBase):
    def test_list_metiers_public(self):
        response = self.client.get(reverse("metier-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_list_prestations_filtered_by_metier(self):
        response = self.client.get(reverse("prestation-list"), {"metier": str(self.metier.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["metier_nom"], "Plombier")


class ArtisanProfileTests(ArtisansTestBase):
    def test_whatsapp_link_generated(self):
        response = self.client.get(reverse("artisan-detail", args=[self.artisan_proche.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["whatsapp_link"], "https://wa.me/22670000061")

    def test_filter_by_verified(self):
        ArtisanProfile.objects.filter(id=self.artisan_loin.id).update(is_verified=False)
        response = self.client.get(reverse("artisan-list"), {"is_verified": True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)


class ServiceRequestTests(ArtisansTestBase):
    def create_demande(self, **overrides):
        payload = dict(
            metier=str(self.metier.id),
            prestation=str(self.prestation.id),
            description_besoin="Fuite dans la cuisine",
            latitude="12.3713",
            longitude="-1.5196",
        )
        payload.update(overrides)
        self.client.force_authenticate(self.locataire)
        return self.client.post(reverse("service-request-list"), payload, format="json")

    def test_create_demande_sets_locataire(self):
        response = self.create_demande()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        demande = ServiceRequest.objects.get(id=response.data["id"])
        self.assertEqual(demande.locataire, self.locataire)
        self.assertEqual(demande.statut, "en_attente")

    def test_assigner_artisan_picks_closest_verified(self):
        create_resp = self.create_demande()
        demande_id = create_resp.data["id"]
        self.client.force_authenticate(self.locataire)
        url = reverse("service-request-assigner-artisan", args=[demande_id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(
            str(response.data["service_request"]["artisan"]), str(self.artisan_proche.id)
        )
        self.assertIn("whatsapp_message", response.data)
        demande = ServiceRequest.objects.get(id=demande_id)
        self.assertEqual(demande.statut, "assignee")

    def test_assigner_artisan_no_candidate(self):
        ArtisanProfile.objects.all().update(is_verified=False)
        create_resp = self.create_demande()
        demande_id = create_resp.data["id"]
        url = reverse("service-request-assigner-artisan", args=[demande_id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_valider_updates_statut_and_artisan_counter(self):
        create_resp = self.create_demande()
        demande_id = create_resp.data["id"]
        self.client.post(reverse("service-request-assigner-artisan", args=[demande_id]))
        url = reverse("service-request-valider", args=[demande_id])
        response = self.client.post(url, {"prix_convenu": 5000}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["statut"], "validee")
        self.artisan_proche.refresh_from_db()
        self.assertEqual(self.artisan_proche.nombre_interventions, 1)


class ServicePaymentTests(ArtisansTestBase):
    def setUp(self):
        super().setUp()
        self.demande = ServiceRequest.objects.create(
            locataire=self.locataire, metier=self.metier, prestation=self.prestation,
            artisan=self.artisan_proche, description_besoin="Fuite", latitude="12.3713",
            longitude="-1.5196", statut="validee", prix_convenu=5000,
        )

    def test_payment_allowed_after_validation(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("service-payment-list")
        response = self.client.post(
            url, {"service_request": str(self.demande.id), "montant": "5000"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        payment = ServicePayment.objects.get(id=response.data["id"])
        self.assertIsNotNone(payment.paid_at)

    def test_payment_rejected_before_validation(self):
        self.demande.statut = "en_cours"
        self.demande.save(update_fields=["statut"])
        self.client.force_authenticate(self.locataire)
        url = reverse("service-payment-list")
        response = self.client.post(
            url, {"service_request": str(self.demande.id), "montant": "5000"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ArtisanReviewTests(ArtisansTestBase):
    def test_review_updates_average_note(self):
        demande = ServiceRequest.objects.create(
            locataire=self.locataire, metier=self.metier, artisan=self.artisan_proche,
            description_besoin="Fuite", latitude="12.3713", longitude="-1.5196", statut="validee",
        )
        self.client.force_authenticate(self.locataire)
        url = reverse("artisan-review-list")
        response = self.client.post(
            url, {"service_request": str(demande.id), "note": 5, "commentaire": "Excellent travail"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.artisan_proche.refresh_from_db()
        self.assertEqual(float(self.artisan_proche.note_moyenne), 5.0)
