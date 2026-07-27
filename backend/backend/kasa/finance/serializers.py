from rest_framework import serializers

from properties.models import Property

from .models import (
    AlternativeDepositSubscription,
    BudgetSimulation,
    DepositSavings,
    RentalContract,
    RentPayment,
)


class RentalContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalContract
        fields = [
            "id", "property", "locataire", "date_debut", "date_fin", "loyer_mensuel",
            "utilise_caution_alternative", "is_active", "document_url", "created_at",
        ]
        read_only_fields = ["created_at"]


class RentPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentPayment
        fields = ["id", "contrat", "mois", "montant", "statut", "paid_at", "reference_transaction"]
        read_only_fields = ["statut", "paid_at"]


class DepositSavingsSerializer(serializers.ModelSerializer):
    solde_restant = serializers.SerializerMethodField()

    class Meta:
        model = DepositSavings
        fields = [
            "id", "contrat", "montant_cible", "montant_epargne", "statut",
            "montant_restitue", "motif_retenue", "solde_restant", "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def get_solde_restant(self, obj):
        return max(obj.montant_cible - obj.montant_epargne, 0)


class AlternativeDepositSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlternativeDepositSubscription
        fields = [
            "id", "contrat", "cotisation_mensuelle", "nombre_mensualites_prevues",
            "montant_verse", "is_active",
        ]


class BudgetSimulationSerializer(serializers.ModelSerializer):
    annonces_suggerees = serializers.SerializerMethodField()

    class Meta:
        model = BudgetSimulation
        fields = [
            "id", "locataire", "revenu_mensuel", "loyer_min_recommande",
            "loyer_max_recommande", "annonces_suggerees", "created_at",
        ]
        read_only_fields = ["locataire", "loyer_min_recommande", "loyer_max_recommande", "created_at"]

    def get_annonces_suggerees(self, obj):
        from properties.serializers import PropertyListSerializer

        qs = Property.objects.filter(
            is_active=True,
            prix__gte=obj.loyer_min_recommande,
            prix__lte=obj.loyer_max_recommande,
        )[:10]
        return PropertyListSerializer(qs, many=True, context=self.context).data

    def create(self, validated_data):
        validated_data["locataire"] = self.context["request"].user
        return super().create(validated_data)
