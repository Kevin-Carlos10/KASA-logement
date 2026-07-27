from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from properties.models import Property, Quartier
from users.models import User

from .models import Visit


class VisitsTestBase(APITestCase):
    def setUp(self):
        self.agent = User.objects.create_user(
            username="agent1", password="pass12345", phone_number="+22670000030", is_agent_terrain=True,
        )
        self.locataire = User.objects.create_user(
            username="locataire1", password="pass12345", phone_number="+22670000031", is_locataire=True,
        )
        self.autre_locataire = User.objects.create_user(
            username="locataire2", password="pass12345", phone_number="+22670000032", is_locataire=True,
        )
        self.bailleur = User.objects.create_user(
            username="bailleur1", password="pass12345", phone_number="+22670000033", is_bailleur=True,
        )
        self.quartier = Quartier.objects.create(nom="Gounghin", ville="Ouagadougou")
        self.property = Property.objects.create(
            bailleur=self.bailleur, type_logement="studio", quartier=self.quartier, prix=50000,
            conditions_location="RAS", latitude="12.3713", longitude="-1.5196", surface_m2="18.5",
        )


class VisitViewSetTests(VisitsTestBase):
    def test_create_visit_sets_visiteur(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("visite-list")
        payload = {"property": str(self.property.id), "date_visite": "2026-08-01T10:00:00Z"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        visit = Visit.objects.get(id=response.data["id"])
        self.assertEqual(visit.visiteur, self.locataire)
        self.assertEqual(visit.statut, "demandee")

    def test_create_visit_requires_auth(self):
        url = reverse("visite-list")
        response = self.client.post(url, {"property": str(self.property.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_tenant_sees_only_own_visits(self):
        Visit.objects.create(property=self.property, visiteur=self.locataire, date_visite="2026-08-01T10:00:00Z")
        Visit.objects.create(property=self.property, visiteur=self.autre_locataire, date_visite="2026-08-02T10:00:00Z")
        self.client.force_authenticate(self.locataire)
        response = self.client.get(reverse("visite-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_agent_sees_only_assigned_visits(self):
        Visit.objects.create(
            property=self.property, visiteur=self.locataire, agent=self.agent, date_visite="2026-08-01T10:00:00Z",
        )
        Visit.objects.create(property=self.property, visiteur=self.autre_locataire, date_visite="2026-08-02T10:00:00Z")
        self.client.force_authenticate(self.agent)
        response = self.client.get(reverse("visite-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_confirmer_action(self):
        visit = Visit.objects.create(property=self.property, visiteur=self.locataire, date_visite="2026-08-01T10:00:00Z")
        self.client.force_authenticate(self.locataire)
        url = reverse("visite-confirmer", args=[visit.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.statut, "confirmee")

    def test_marquer_effectuee_action(self):
        visit = Visit.objects.create(property=self.property, visiteur=self.locataire, date_visite="2026-08-01T10:00:00Z")
        self.client.force_authenticate(self.locataire)
        url = reverse("visite-marquer-effectuee", args=[visit.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.statut, "effectuee")
