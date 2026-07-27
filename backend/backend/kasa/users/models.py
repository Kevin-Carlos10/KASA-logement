import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Utilisateur KaSa. Un même compte peut avoir plusieurs rôles
    (ex: un locataire peut aussi être artisan), donc les rôles sont
    gérés via des booléens plutôt qu'un choix unique."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=20, unique=True)
    whatsapp_number = models.CharField(max_length=20, blank=True)
    is_locataire = models.BooleanField(default=True)
    is_bailleur = models.BooleanField(default=False)
    is_agent_terrain = models.BooleanField(default=False)
    is_artisan = models.BooleanField(default=False)
    identity_verified = models.BooleanField(default=False)
    quartier = models.CharField(max_length=100, blank=True)
    ville = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.phone_number})"


class AgentTerrainProfile(models.Model):
    """Profil complémentaire pour les agents terrain, avec la note
    de réputation utilisée dans le module 'Système de réputation'."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="agent_profile")
    zones_couvertes = models.CharField(max_length=255, blank=True, help_text="Quartiers couverts par l'agent")
    trust_score = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_visites = models.PositiveIntegerField(default=0)

    def recompute_trust_score(self):
        # `note` est une propriété Python calculée (moyenne de 4 critères),
        # pas une colonne en base : impossible d'utiliser Avg("note") ici.
        ratings = self.user.agent_ratings.all()
        notes = [r.note for r in ratings]
        self.trust_score = round(sum(notes) / len(notes), 2) if notes else 0
        self.save(update_fields=["trust_score"])

    def __str__(self):
        return f"Agent {self.user.username}"
