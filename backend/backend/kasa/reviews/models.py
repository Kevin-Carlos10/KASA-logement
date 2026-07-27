import uuid
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from properties.models import Property

NOTE_VALIDATORS = [MinValueValidator(1), MaxValueValidator(5)]


class AgentTerrainRating(models.Model):
    """Note de l'agent terrain après une visite : qualité de
    l'accompagnement, ponctualité, exactitude, professionnalisme."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="agent_ratings",
        limit_choices_to={"is_agent_terrain": True},
    )
    locataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes_donnees_agents")
    qualite_accompagnement = models.PositiveSmallIntegerField(validators=NOTE_VALIDATORS)
    ponctualite = models.PositiveSmallIntegerField(validators=NOTE_VALIDATORS)
    exactitude_informations = models.PositiveSmallIntegerField(validators=NOTE_VALIDATORS)
    comportement_professionnel = models.PositiveSmallIntegerField(validators=NOTE_VALIDATORS)
    commentaire = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def note(self):
        return (
            self.qualite_accompagnement + self.ponctualite
            + self.exactitude_informations + self.comportement_professionnel
        ) / 4

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if hasattr(self.agent, "agent_profile"):
            self.agent.agent_profile.recompute_trust_score()

    def __str__(self):
        return f"Note {self.note}/5 pour {self.agent}"


class TenantReview(models.Model):
    """Avis obligatoire d'un ancien locataire après son départ."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="reviews")
    locataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="avis_logements")
    eau_disponible = models.BooleanField()
    courant_disponible = models.BooleanField()
    securite_quartier = models.PositiveSmallIntegerField(validators=NOTE_VALIDATORS)
    respect_bailleur = models.PositiveSmallIntegerField(validators=NOTE_VALIDATORS)
    qualite_voisinage = models.PositiveSmallIntegerField(validators=NOTE_VALIDATORS)
    proprete = models.PositiveSmallIntegerField(validators=NOTE_VALIDATORS)
    commentaire = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("property", "locataire")

    def __str__(self):
        return f"Avis de {self.locataire} sur {self.property}"
