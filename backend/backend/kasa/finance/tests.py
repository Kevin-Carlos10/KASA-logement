from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from properties.models import Property, Quartier
from users.models import User

from .models import AlternativeDepositSubscription, DepositSavings, RentalContract, RentPayment


class FinanceTestBase(APITestCase):
    def setUp(self):
        self.locataire = User.objects.create_user(
            username="locataire1", password="pass12345", phone_number="+22670000050", is_locataire=True,
        )
        self.bailleur = User.objects.create_user(
            username="bailleur1", password="pass12345", phone_number="+22670000051", is_bailleur=True,
        )
        self.quartier = Quartier.objects.create(nom="Gounghin", ville="Ouagadougou")
        self.property = Property.objects.create(
            bailleur=self.bailleur, type_logement="studio", quartier=self.quartier, prix=50000,
            conditions_location="RAS", latitude="12.3713", longitude="-1.5196", surface_m2="18.5",
        )
        self.contrat = RentalContract.objects.create(
            property=self.property, locataire=self.locataire, date_debut="2026-01-01", loyer_mensuel=50000,
        )


class RentalContractTests(FinanceTestBase):
    def test_create_contract_requires_auth(self):
        url = reverse("contrat-list")
        response = self.client.post(url, {"property": str(self.property.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_contract(self):
        self.client.force_authenticate(self.bailleur)
        url = reverse("contrat-list")
        payload = {
            "property": str(self.property.id),
            "locataire": str(self.locataire.id),
            "date_debut": "2026-02-01",
            "loyer_mensuel": "55000",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


class RentPaymentTests(FinanceTestBase):
    def test_create_payment_defaults_en_attente(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("rent-payment-list")
        payload = {"contrat": str(self.contrat.id), "mois": "2026-02-01", "montant": "50000"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["statut"], "en_attente")

    def test_payer_action_marks_paid(self):
        payment = RentPayment.objects.create(contrat=self.contrat, mois="2026-03-01", montant=50000)
        self.client.force_authenticate(self.locataire)
        url = reverse("rent-payment-payer", args=[payment.id])
        response = self.client.post(url, {"reference_transaction": "TX-001"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.statut, "paye")
        self.assertIsNotNone(payment.paid_at)
        self.assertEqual(payment.reference_transaction, "TX-001")

    def test_duplicate_payment_same_month_rejected(self):
        RentPayment.objects.create(contrat=self.contrat, mois="2026-03-01", montant=50000)
        self.client.force_authenticate(self.locataire)
        url = reverse("rent-payment-list")
        payload = {"contrat": str(self.contrat.id), "mois": "2026-03-01", "montant": "50000"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DepositSavingsTests(FinanceTestBase):
    def setUp(self):
        super().setUp()
        self.epargne = DepositSavings.objects.create(contrat=self.contrat, montant_cible=100000)

    def test_cotiser_increments_and_caps_at_target(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("deposit-savings-cotiser", args=[self.epargne.id])
        response = self.client.post(url, {"montant": 60000}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(int(response.data["montant_epargne"]), 60000)
        self.assertEqual(response.data["statut"], "en_cours")

        response = self.client.post(url, {"montant": 60000}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(int(response.data["montant_epargne"]), 100000)
        self.assertEqual(response.data["statut"], "complete")

    def test_cotiser_requires_montant(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("deposit-savings-cotiser", args=[self.epargne.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_restituer_sans_retenue(self):
        self.epargne.montant_epargne = 100000
        self.epargne.save(update_fields=["montant_epargne"])
        self.client.force_authenticate(self.locataire)
        url = reverse("deposit-savings-restituer", args=[self.epargne.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["statut"], "restituee")
        self.assertEqual(int(response.data["montant_restitue"]), 100000)

    def test_restituer_avec_retenue(self):
        self.epargne.montant_epargne = 100000
        self.epargne.save(update_fields=["montant_epargne"])
        self.client.force_authenticate(self.locataire)
        url = reverse("deposit-savings-restituer", args=[self.epargne.id])
        response = self.client.post(url, {"montant_retenu": 20000, "motif_retenue": "Dégâts constatés"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["statut"], "retenue")
        self.assertEqual(int(response.data["montant_restitue"]), 80000)

    def test_solde_restant_computed(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("deposit-savings-detail", args=[self.epargne.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(int(response.data["solde_restant"]), 100000)


class AlternativeDepositSubscriptionTests(FinanceTestBase):
    def test_cotiser_accumulates(self):
        sub = AlternativeDepositSubscription.objects.create(contrat=self.contrat, cotisation_mensuelle=10000)
        self.client.force_authenticate(self.locataire)
        url = reverse("alt-deposit-cotiser", args=[sub.id])
        self.client.post(url)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(int(response.data["montant_verse"]), 20000)


class BudgetSimulationTests(FinanceTestBase):
    def test_simulation_computes_range_and_suggestions(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("budget-simulation-list")
        response = self.client.post(url, {"revenu_mensuel": "200000"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(int(response.data["loyer_min_recommande"]), 40000)
        self.assertEqual(int(response.data["loyer_max_recommande"]), 60000)
        self.assertIn("annonces_suggerees", response.data)
        # notre logement à 50000 FCFA doit être suggéré
        self.assertEqual(len(response.data["annonces_suggerees"]), 1)

    def test_user_only_sees_own_simulations(self):
        other = User.objects.create_user(
            username="locataire2", password="pass12345", phone_number="+22670000052", is_locataire=True,
        )
        self.client.force_authenticate(self.locataire)
        self.client.post(reverse("budget-simulation-list"), {"revenu_mensuel": "150000"}, format="json")
        self.client.force_authenticate(other)
        self.client.post(reverse("budget-simulation-list"), {"revenu_mensuel": "300000"}, format="json")
        response = self.client.get(reverse("budget-simulation-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
