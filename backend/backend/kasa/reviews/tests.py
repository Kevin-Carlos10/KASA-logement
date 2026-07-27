from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from properties.models import Property, Quartier
from users.models import AgentTerrainProfile, User

from .models import AgentTerrainRating, TenantReview


class ReviewsTestBase(APITestCase):
    def setUp(self):
        self.agent = User.objects.create_user(
            username="agent1", password="pass12345", phone_number="+22670000020", is_agent_terrain=True,
        )
        self.agent_profile = AgentTerrainProfile.objects.create(user=self.agent)
        self.locataire = User.objects.create_user(
            username="locataire1", password="pass12345", phone_number="+22670000021", is_locataire=True,
        )
        self.bailleur = User.objects.create_user(
            username="bailleur1", password="pass12345", phone_number="+22670000022", is_bailleur=True,
        )
        self.quartier = Quartier.objects.create(nom="Gounghin", ville="Ouagadougou")
        self.property = Property.objects.create(
            bailleur=self.bailleur,
            type_logement="studio",
            quartier=self.quartier,
            prix=50000,
            conditions_location="Avance de deux mois",
            latitude="12.3713",
            longitude="-1.5196",
            surface_m2="18.5",
        )


class AgentTerrainRatingTests(ReviewsTestBase):
    def test_create_rating_sets_locataire_and_computes_note(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("agent-rating-list")
        payload = {
            "agent": str(self.agent.id),
            "qualite_accompagnement": 5,
            "ponctualite": 4,
            "exactitude_informations": 5,
            "comportement_professionnel": 4,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        rating = AgentTerrainRating.objects.get(id=response.data["id"])
        self.assertEqual(rating.locataire, self.locataire)
        self.assertEqual(float(response.data["note"]), 4.5)

    def test_create_rating_recomputes_agent_trust_score(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("agent-rating-list")
        payload = {
            "agent": str(self.agent.id),
            "qualite_accompagnement": 5,
            "ponctualite": 5,
            "exactitude_informations": 5,
            "comportement_professionnel": 5,
        }
        self.client.post(url, payload, format="json")
        self.agent_profile.refresh_from_db()
        self.assertEqual(float(self.agent_profile.trust_score), 5.0)

    def test_create_rating_requires_auth(self):
        url = reverse("agent-rating-list")
        response = self.client.post(url, {"agent": str(self.agent.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_note_out_of_range_rejected(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("agent-rating-list")
        payload = {
            "agent": str(self.agent.id),
            "qualite_accompagnement": 6,
            "ponctualite": 4,
            "exactitude_informations": 5,
            "comportement_professionnel": 4,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TenantReviewTests(ReviewsTestBase):
    def test_create_tenant_review(self):
        self.client.force_authenticate(self.locataire)
        url = reverse("tenant-review-list")
        payload = {
            "property": str(self.property.id),
            "eau_disponible": True,
            "courant_disponible": True,
            "securite_quartier": 4,
            "respect_bailleur": 5,
            "qualite_voisinage": 4,
            "proprete": 3,
            "commentaire": "Bon logement dans l'ensemble.",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        review = TenantReview.objects.get(id=response.data["id"])
        self.assertEqual(review.locataire, self.locataire)

    def test_duplicate_review_for_same_property_rejected(self):
        TenantReview.objects.create(
            property=self.property, locataire=self.locataire, eau_disponible=True,
            courant_disponible=True, securite_quartier=4, respect_bailleur=4,
            qualite_voisinage=4, proprete=4,
        )
        self.client.force_authenticate(self.locataire)
        url = reverse("tenant-review-list")
        payload = {
            "property": str(self.property.id),
            "eau_disponible": True,
            "courant_disponible": True,
            "securite_quartier": 4,
            "respect_bailleur": 4,
            "qualite_voisinage": 4,
            "proprete": 4,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_reviews_by_property(self):
        TenantReview.objects.create(
            property=self.property, locataire=self.locataire, eau_disponible=True,
            courant_disponible=True, securite_quartier=4, respect_bailleur=4,
            qualite_voisinage=4, proprete=4,
        )
        url = reverse("tenant-review-list")
        response = self.client.get(url, {"property": str(self.property.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
