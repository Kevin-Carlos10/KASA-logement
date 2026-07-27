import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from properties.models import Property


class RentalContract(models.Model):
    """Contrat de location clair et formalisé, point de départ de la
    location : paiement mensuel, épargne de caution, etc."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="contrats")
    locataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contrats")
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    loyer_mensuel = models.DecimalField(max_digits=12, decimal_places=0)
    utilise_caution_alternative = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    document_url = models.URLField(blank=True, help_text="Lien vers le contrat formalisé (PDF)")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Contrat {self.property} - {self.locataire}"


class RentPayment(models.Model):
    """Paiement mensuel digitalisé via l'application."""

    STATUT_CHOICES = [("en_attente", "En attente"), ("paye", "Payé"), ("en_retard", "En retard")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contrat = models.ForeignKey(RentalContract, on_delete=models.CASCADE, related_name="paiements")
    mois = models.DateField(help_text="Premier jour du mois concerné")
    montant = models.DecimalField(max_digits=12, decimal_places=0)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default="en_attente")
    paid_at = models.DateTimeField(null=True, blank=True)
    reference_transaction = models.CharField(max_length=100, blank=True)

    class Meta:
        unique_together = ("contrat", "mois")
        ordering = ["-mois"]

    def __str__(self):
        return f"Loyer {self.mois:%m/%Y} - {self.contrat}"


class DepositSavings(models.Model):
    """Épargne automatique de la caution classique, avec restitution
    équitable et garantie en fin de contrat."""

    STATUT_CHOICES = [
        ("en_cours", "Épargne en cours"),
        ("complete", "Caution complète"),
        ("restituee", "Restituée au locataire"),
        ("retenue", "Retenue (dégâts constatés)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contrat = models.OneToOneField(RentalContract, on_delete=models.CASCADE, related_name="epargne_caution")
    montant_cible = models.DecimalField(max_digits=12, decimal_places=0)
    montant_epargne = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default="en_cours")
    montant_restitue = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    motif_retenue = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Caution {self.contrat} : {self.montant_epargne}/{self.montant_cible}"


class AlternativeDepositSubscription(models.Model):
    """9. Caution alternative : cotisation mensuelle remplaçant la
    caution classique bloquée, activable au choix du bailleur."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contrat = models.OneToOneField(RentalContract, on_delete=models.CASCADE, related_name="cotisation_alternative")
    cotisation_mensuelle = models.DecimalField(max_digits=10, decimal_places=0)
    nombre_mensualites_prevues = models.PositiveSmallIntegerField(default=12)
    montant_verse = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Cotisation alternative {self.contrat}"


class BudgetSimulation(models.Model):
    """8. Simulateur de budget : recommande une fourchette de loyer
    raisonnable selon le revenu mensuel du locataire."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    locataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="simulations_budget")
    revenu_mensuel = models.DecimalField(max_digits=12, decimal_places=0)
    loyer_min_recommande = models.DecimalField(max_digits=12, decimal_places=0, editable=False)
    loyer_max_recommande = models.DecimalField(max_digits=12, decimal_places=0, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Règle usuelle : le loyer ne devrait pas dépasser 30% du revenu,
    # avec une fourchette de 20% à 30% pour éviter le surendettement.
    RATIO_MIN = Decimal("0.20")
    RATIO_MAX = Decimal("0.30")

    def save(self, *args, **kwargs):
        self.loyer_min_recommande = round(self.revenu_mensuel * self.RATIO_MIN, 0)
        self.loyer_max_recommande = round(self.revenu_mensuel * self.RATIO_MAX, 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Simulation {self.locataire} - revenu {self.revenu_mensuel}"
