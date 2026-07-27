from rest_framework import serializers

from .models import AgentTerrainRating, TenantReview


class AgentTerrainRatingSerializer(serializers.ModelSerializer):
    note = serializers.ReadOnlyField()

    class Meta:
        model = AgentTerrainRating
        fields = [
            "id", "agent", "locataire", "qualite_accompagnement", "ponctualite",
            "exactitude_informations", "comportement_professionnel", "commentaire",
            "note", "created_at",
        ]
        read_only_fields = ["locataire", "created_at"]

    def create(self, validated_data):
        validated_data["locataire"] = self.context["request"].user
        return super().create(validated_data)


class TenantReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantReview
        fields = [
            "id", "property", "locataire", "eau_disponible", "courant_disponible",
            "securite_quartier", "respect_bailleur", "qualite_voisinage", "proprete",
            "commentaire", "created_at",
        ]
        read_only_fields = ["locataire", "created_at"]

    def validate(self, attrs):
        # "locataire" est en lecture seule (déduit de la requête), donc le
        # validateur unique_together auto-généré par DRF ne peut pas le
        # vérifier : on le fait explicitement pour éviter une IntegrityError.
        request = self.context.get("request")
        if request and not self.instance:
            if TenantReview.objects.filter(property=attrs.get("property"), locataire=request.user).exists():
                raise serializers.ValidationError("Vous avez déjà laissé un avis pour ce logement.")
        return attrs

    def create(self, validated_data):
        validated_data["locataire"] = self.context["request"].user
        return super().create(validated_data)
