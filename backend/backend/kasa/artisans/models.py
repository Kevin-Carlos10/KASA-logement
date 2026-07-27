import uuid
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Metier(models.Model):
    """Corps de métiers proposés (électricien, plombier, etc.)."""

    nom = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nom


class ArtisanProfile(models.Model):
    """Un artisan = un métier principal, avec géo-repérage et réputation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="artisan_profile")
    metier = models.ForeignKey(Metier, on_delete=models.PROTECT, related_name="artisans")
    quartier = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    whatsapp_number = models.CharField(max_length=20)
    is_verified = models.BooleanField(default=False)
    nombre_interventions = models.PositiveIntegerField(default=0)
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.user.username} - {self.metier}"


class Prestation(models.Model):
    """Prestations à prix de référence régulé (pas de négociation libre)."""

    TARIFICATION_CHOICES = [("forfait", "Forfait"), ("horaire", "Tarif horaire")]

    metier = models.ForeignKey(Metier, on_delete=models.CASCADE, related_name="prestations")
    nom = models.CharField(max_length=150)
    type_tarification = models.CharField(max_length=10, choices=TARIFICATION_CHOICES)
    prix_reference = models.DecimalField(max_digits=10, decimal_places=0)

    def __str__(self):
        return f"{self.nom} ({self.get_type_tarification_display()}) - {self.prix_reference} FCFA"


class ServiceRequest(models.Model):
    """Mise en relation entre un locataire et l'artisan disponible le
    plus proche et le mieux noté."""

    STATUT_CHOICES = [
        ("en_attente", "En attente d'un artisan"),
        ("assignee", "Assignée"),
        ("en_cours", "Intervention en cours"),
        ("validee", "Validée par le locataire"),
        ("annulee", "Annulée"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    locataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="demandes_service")
    metier = models.ForeignKey(Metier, on_delete=models.PROTECT, related_name="demandes")
    prestation = models.ForeignKey(Prestation, on_delete=models.SET_NULL, null=True, blank=True)
    artisan = models.ForeignKey(
        ArtisanProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="interventions"
    )
    description_besoin = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default="en_attente")
    prix_convenu = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    validated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Demande {self.metier} par {self.locataire}"


class ServicePayment(models.Model):
    """Paiement obligatoire une fois l'intervention validée, tracé via
    l'application (pas de main à la main non enregistré)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_request = models.OneToOneField(ServiceRequest, on_delete=models.CASCADE, related_name="paiement")
    montant = models.DecimalField(max_digits=10, decimal_places=0)
    reference_transaction = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Paiement {self.montant} FCFA - {self.service_request}"


class ArtisanReview(models.Model):
    """Note et commentaire laissés par le locataire après chaque
    intervention, visible sur l'historique du profil de l'artisan."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_request = models.OneToOneField(ServiceRequest, on_delete=models.CASCADE, related_name="avis")
    note = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    commentaire = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        artisan = self.service_request.artisan
        if artisan:
            from django.db.models import Avg
            agg = ArtisanReview.objects.filter(service_request__artisan=artisan).aggregate(avg=Avg("note"))
            artisan.note_moyenne = agg["avg"] or 0
            artisan.save(update_fields=["note_moyenne"])

    def __str__(self):
        return f"Avis {self.note}/5 - {self.service_request}"
