from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import AgentTerrainProfile, User


class RegisterAndAuthTests(APITestCase):
    """Inscription, connexion (JWT) et profil courant."""

    def test_register_creates_user(self):
        url = reverse("register")
        payload = {
            "username": "amina",
            "email": "amina@example.com",
            "password": "MotDePasse#123",
            "phone_number": "+22670000001",
            "is_locataire": True,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(User.objects.filter(username="amina").exists())
        user = User.objects.get(username="amina")
        self.assertTrue(user.check_password("MotDePasse#123"))
        # le mot de passe ne doit jamais être renvoyé
        self.assertNotIn("password", response.data)

    def test_login_returns_jwt_tokens(self):
        User.objects.create_user(username="amina", password="MotDePasse#123", phone_number="+22670000001")
        url = reverse("token_obtain_pair")
        response = self.client.post(url, {"username": "amina", "password": "MotDePasse#123"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_wrong_password_rejected(self):
        User.objects.create_user(username="amina", password="MotDePasse#123", phone_number="+22670000001")
        url = reverse("token_obtain_pair")
        response = self.client.post(url, {"username": "amina", "password": "mauvais"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requires_authentication(self):
        url = reverse("me")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_get_and_patch(self):
        user = User.objects.create_user(
            username="amina", password="MotDePasse#123", phone_number="+22670000001", quartier="Gounghin",
        )
        self.client.force_authenticate(user)
        url = reverse("me")

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "amina")

        response = self.client.patch(url, {"quartier": "Tanghin"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["quartier"], "Tanghin")
        user.refresh_from_db()
        self.assertEqual(user.quartier, "Tanghin")


class AgentTerrainViewSetTests(APITestCase):
    """Liste (lecture seule) des agents terrain avec leur trust_score."""

    def setUp(self):
        self.agent = User.objects.create_user(
            username="agent1", password="pass12345", phone_number="+22670000002", is_agent_terrain=True,
        )
        self.profile = AgentTerrainProfile.objects.create(user=self.agent, zones_couvertes="Gounghin, Tanghin")

    def test_list_agents_public(self):
        url = reverse("agent-terrain-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_agent_endpoint_is_read_only(self):
        self.client.force_authenticate(self.agent)
        url = reverse("agent-terrain-list")
        response = self.client.post(url, {"user": str(self.agent.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
