import uuid
from django.conf import settings
from django.db import models

from properties.models import Property


class Visit(models.Model):
    STATUT_CHOICES = [
        ("demandee", "Demandée"),
        ("confirmee", "Confirmée"),
        ("effectuee", "Effectuée"),
        ("annulee", "Annulée"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="visites")
    visiteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="visites_reservees")
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="visites_a_effectuer"
    )
    date_visite = models.DateTimeField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default="demandee")

    # Frais de déplacement de l'agent : non obligatoires, contribution volontaire
    frais_deplacement_contribues = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_visite"]

    def __str__(self):
        return f"Visite {self.property} par {self.visiteur} le {self.date_visite:%d/%m/%Y}"
