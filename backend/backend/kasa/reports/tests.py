from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from properties.models import Property, Quartier
from users.models import User

from .models import Report


class ReportsTestBase(APITestCase):
    def setUp(self):
        self.locataire = User.objects.create_user(
            username="locataire1", password="pass12345", phone_number="+22670000040", is_locataire=True,
        )
        self.bailleur = User.objects.create_user(
            username="bailleur1", password="pass12345", phone_number="+22670000041", is_bailleur=True,
        )
        self.admin = User.objects.create_superuser(
            username="admin1", password="pass12345", phone_number="+22670000042",
        )
        self.quartier = Quartier.objects.create(nom="Gounghin", ville="Ouagadougou")
        self.property = Property.objects.create(
            bailleur=self.bailleur, type_logement="studio", quartier=self.quartier, prix=50000,
            conditions_location="RAS", latitude="12.3713", longitude="-1.5196", surface_m2="18.5",
        )


class ReportViewSetTests(ReportsTestBase):
    def test_create_report_sets_locataire(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("signalement-list")
        payload = {
            "property": str(self.property.id),
            "type_signalement": "absence_eau",
            "description": "Pas d'eau depuis 3 jours.",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        report = Report.objects.get(id=response.data["id"])
        self.assertEqual(report.locataire, self.locataire)
        self.assertEqual(report.statut, "ouvert")

    def test_create_report_requires_auth(self):
        url = reverse("signalement-list")
        response = self.client.post(url, {"property": str(self.property.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_resoudre_requires_admin(self):
        report = Report.objects.create(
            property=self.property, locataire=self.locataire, type_signalement="absence_eau",
        )
        self.client.force_authenticate(self.locataire)
        url = reverse("signalement-resoudre", args=[report.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resoudre_by_admin(self):
        report = Report.objects.create(
            property=self.property, locataire=self.locataire, type_signalement="absence_eau",
        )
        self.client.force_authenticate(self.admin)
        url = reverse("signalement-resoudre", args=[report.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertEqual(report.statut, "resolu")
        self.assertIsNotNone(report.resolved_at)

    def test_filter_reports_by_statut(self):
        Report.objects.create(property=self.property, locataire=self.locataire, type_signalement="absence_eau")
        Report.objects.create(
            property=self.property, locataire=self.locataire, type_signalement="securite", statut="resolu",
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse("signalement-list"), {"statut": "ouvert"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
