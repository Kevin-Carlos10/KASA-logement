from rest_framework import serializers

from .models import ArtisanProfile, ArtisanReview, Metier, Prestation, ServicePayment, ServiceRequest


class MetierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metier
        fields = ["id", "nom"]


class PrestationSerializer(serializers.ModelSerializer):
    metier_nom = serializers.CharField(source="metier.nom", read_only=True)

    class Meta:
        model = Prestation
        fields = ["id", "metier", "metier_nom", "nom", "type_tarification", "prix_reference"]


class ArtisanProfileSerializer(serializers.ModelSerializer):
    metier_nom = serializers.CharField(source="metier.nom", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    whatsapp_link = serializers.SerializerMethodField()

    class Meta:
        model = ArtisanProfile
        fields = [
            "id", "user", "username", "metier", "metier_nom", "quartier", "latitude", "longitude",
            "whatsapp_number", "whatsapp_link", "is_verified", "nombre_interventions", "note_moyenne",
        ]
        read_only_fields = ["is_verified", "nombre_interventions", "note_moyenne"]

    def get_whatsapp_link(self, obj):
        return f"https://wa.me/{obj.whatsapp_number.lstrip('+')}"


class ServiceRequestSerializer(serializers.ModelSerializer):
    artisan_detail = ArtisanProfileSerializer(source="artisan", read_only=True)

    class Meta:
        model = ServiceRequest
        fields = [
            "id", "locataire", "metier", "prestation", "artisan", "artisan_detail",
            "description_besoin", "latitude", "longitude", "statut", "prix_convenu",
            "created_at", "validated_at",
        ]
        read_only_fields = ["locataire", "artisan", "statut", "created_at", "validated_at"]

    def create(self, validated_data):
        validated_data["locataire"] = self.context["request"].user
        return super().create(validated_data)


class ServicePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePayment
        fields = ["id", "service_request", "montant", "reference_transaction", "paid_at"]
        read_only_fields = ["paid_at"]


class ArtisanReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtisanReview
        fields = ["id", "service_request", "note", "commentaire", "created_at"]
        read_only_fields = ["created_at"]
