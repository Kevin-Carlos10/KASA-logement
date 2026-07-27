from django.db.models import Avg
from rest_framework import serializers

from .models import ElectricityInfo, PriceHistory, Property, PropertyPhoto, Quartier, WaterInfo


class QuartierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quartier
        fields = ["id", "nom", "ville", "arrondissement", "boundary_geojson", "arrondissement_boundary_geojson"]


class PropertyPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyPhoto
        fields = ["id", "image", "piece", "uploaded_at"]


class WaterInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterInfo
        fields = ["id", "property", "disponible", "type_compteur", "derniere_facture_onea", "frequence_coupures"]


class ElectricityInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ElectricityInfo
        fields = [
            "id", "property", "disponible", "type_compteur", "type_alimentation",
            "derniere_facture_sonabel", "montant_moyen_redevance",
        ]

    def validate(self, attrs):
        if attrs.get("type_alimentation") == "classique" and not attrs.get("derniere_facture_sonabel"):
            raise serializers.ValidationError(
                "La dernière facture SONABEL est obligatoire pour un compteur classique."
            )
        if attrs.get("type_alimentation") == "cash_power" and attrs.get("montant_moyen_redevance") is None:
            raise serializers.ValidationError(
                "Le montant moyen des redevances est obligatoire pour CASH POWER."
            )
        return attrs


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = ["id", "ancien_prix", "nouveau_prix", "justification", "changed_at", "changed_by"]
        read_only_fields = ["changed_at", "changed_by"]


class PropertyListSerializer(serializers.ModelSerializer):
    """Vue allégée pour les listes / recherche."""

    quartier_nom = serializers.CharField(source="quartier.nom", read_only=True)
    photo_principale = serializers.SerializerMethodField()
    note_moyenne_avis = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id", "type_logement", "quartier", "quartier_nom", "prix", "surface_m2",
            "acces_goudron", "latitude", "longitude", "is_verified", "date_publication",
            "photo_principale", "note_moyenne_avis",
        ]

    def get_photo_principale(self, obj):
        photo = obj.photos.first()
        return photo.image.url if photo else None

    def get_note_moyenne_avis(self, obj):
        agg = obj.reviews.aggregate(avg=Avg("proprete"))
        return round(agg["avg"], 1) if agg["avg"] else None


class PropertyDetailSerializer(serializers.ModelSerializer):
    photos = PropertyPhotoSerializer(many=True, read_only=True)
    water_info = WaterInfoSerializer(read_only=True)
    electricity_info = ElectricityInfoSerializer(read_only=True)
    price_history = PriceHistorySerializer(many=True, read_only=True)
    quartier_detail = QuartierSerializer(source="quartier", read_only=True)
    commission_kasa_montant = serializers.ReadOnlyField()

    class Meta:
        model = Property
        fields = [
            "id", "bailleur", "agent_terrain", "type_logement", "quartier", "quartier_detail",
            "prix", "conditions_location", "date_publication", "latitude", "longitude",
            "surface_m2", "acces_goudron", "is_verified", "video_url",
            "commission_kasa_pourcentage", "commission_kasa_montant", "is_active",
            "photos", "water_info", "electricity_info", "price_history",
            "created_at", "updated_at",
        ]
        read_only_fields = ["is_verified", "bailleur", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["bailleur"] = self.context["request"].user
        return super().create(validated_data)
