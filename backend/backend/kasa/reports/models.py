import uuid
from django.conf import settings
from django.db import models

from properties.models import Property


class Report(models.Model):
    """6. Signalement obligatoire."""

    TYPE_CHOICES = [
        ("prix_non_justifie", "Changement de prix non justifié"),
        ("conditions_changees", "Changement des conditions de location"),
        ("fausse_annonce", "Fausse annonce"),
        ("absence_eau", "Absence d'eau"),
        ("absence_courant", "Absence de courant"),
        ("securite", "Problème de sécurité"),
    ]
    STATUT_CHOICES = [
        ("ouvert", "Ouvert"),
        ("en_cours", "En cours de traitement"),
        ("resolu", "Résolu"),
        ("rejete", "Rejeté"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="signalements")
    locataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="signalements")
    type_signalement = models.CharField(max_length=30, choices=TYPE_CHOICES)
    description = models.TextField(blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default="ouvert")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_type_signalement_display()} - {self.property}"
