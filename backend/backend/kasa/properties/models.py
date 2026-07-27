import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class Quartier(models.Model):
    """Utilisé pour la cartographie avancée : limites de quartiers et
    d'arrondissements affichées sur la carte."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=100)
    ville = models.CharField(max_length=100)
    arrondissement = models.CharField(max_length=100, blank=True)
    boundary_geojson = models.JSONField(
        blank=True, null=True,
        help_text="Polygone GeoJSON des limites du quartier",
    )
    arrondissement_boundary_geojson = models.JSONField(
        blank=True, null=True,
        help_text="Polygone GeoJSON des limites de l'arrondissement",
    )

    class Meta:
        unique_together = ("nom", "ville")

    def __str__(self):
        return f"{self.nom} ({self.ville})"


class Property(models.Model):
    """Un logement / une annonce."""

    TYPE_LOGEMENT_CHOICES = [
        ("studio", "Studio"),
        ("chambre_salon", "Chambre-salon"),
        ("appartement", "Appartement"),
        ("villa", "Villa"),
        ("maison_cour_commune", "Maison / Cour commune"),
        ("autre", "Autre"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bailleur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="logements_proposes"
    )
    agent_terrain = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="logements_assignes", limit_choices_to={"is_agent_terrain": True},
    )

    # Informations obligatoires
    type_logement = models.CharField(max_length=30, choices=TYPE_LOGEMENT_CHOICES)
    quartier = models.ForeignKey(Quartier, on_delete=models.PROTECT, related_name="logements")
    prix = models.DecimalField(max_digits=12, decimal_places=0, help_text="Prix réel demandé par le bailleur (FCFA)")
    conditions_location = models.TextField(help_text="Conditions de location (avance, durée min., etc.)")
    date_publication = models.DateTimeField(auto_now_add=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    surface_m2 = models.DecimalField(max_digits=8, decimal_places=2, help_text="Surface en m²")
    acces_goudron = models.BooleanField(default=False, help_text="Accès direct à une route bitumée")

    # Vérification de l'annonce
    is_verified = models.BooleanField(default=False)
    video_url = models.URLField(blank=True, help_text="Vidéo complète du logement")

    # Prix / transparence
    commission_kasa_pourcentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("25.00"))

    # Statut
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_publication"]

    def __str__(self):
        return f"{self.get_type_logement_display()} - {self.quartier} - {self.prix} FCFA"

    @property
    def commission_kasa_montant(self):
        return round(Decimal(self.prix) * Decimal(self.commission_kasa_pourcentage) / 100, 0)


class PropertyPhoto(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="logements/photos/")
    piece = models.CharField(max_length=100, blank=True, help_text="Ex: Chambre 1, Cuisine, Salon")
    uploaded_at = models.DateTimeField(auto_now_add=True)


class WaterInfo(models.Model):
    COMPTEUR_CHOICES = [("individuel", "Individuel"), ("partage", "Partagé")]

    property = models.OneToOneField(Property, on_delete=models.CASCADE, related_name="water_info")
    disponible = models.BooleanField(default=True)
    type_compteur = models.CharField(max_length=20, choices=COMPTEUR_CHOICES)
    derniere_facture_onea = models.FileField(upload_to="logements/factures_onea/")
    frequence_coupures = models.CharField(
        max_length=255, blank=True,
        help_text="Fréquence des coupures signalée par les anciens locataires",
    )

    def __str__(self):
        return f"Eau - {self.property}"


class ElectricityInfo(models.Model):
    COMPTEUR_CHOICES = [("individuel", "Individuel"), ("partage", "Partagé")]
    TYPE_CHOICES = [("cash_power", "CASH POWER"), ("classique", "Compteur classique")]

    property = models.OneToOneField(Property, on_delete=models.CASCADE, related_name="electricity_info")
    disponible = models.BooleanField(default=True)
    type_compteur = models.CharField(max_length=20, choices=COMPTEUR_CHOICES)
    type_alimentation = models.CharField(max_length=20, choices=TYPE_CHOICES)
    derniere_facture_sonabel = models.FileField(
        upload_to="logements/factures_sonabel/", blank=True, null=True,
        help_text="Obligatoire si compteur classique",
    )
    montant_moyen_redevance = models.DecimalField(
        max_digits=10, decimal_places=0, blank=True, null=True,
        help_text="Obligatoire si CASH POWER",
    )

    def __str__(self):
        return f"Électricité - {self.property}"


class PriceHistory(models.Model):
    """Historique des modifications de prix, avec justification -
    alimente aussi les données de marché."""

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="price_history")
    ancien_prix = models.DecimalField(max_digits=12, decimal_places=0)
    nouveau_prix = models.DecimalField(max_digits=12, decimal_places=0)
    justification = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.property} : {self.ancien_prix} -> {self.nouveau_prix}"
