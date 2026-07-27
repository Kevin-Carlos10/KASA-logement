from rest_framework import serializers

from .models import Visit


class VisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visit
        fields = [
            "id", "property", "visiteur", "agent", "date_visite", "statut",
            "frais_deplacement_contribues", "created_at",
        ]
        read_only_fields = ["visiteur", "created_at"]

    def create(self, validated_data):
        validated_data["visiteur"] = self.context["request"].user
        return super().create(validated_data)
