from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id", "property", "locataire", "type_signalement", "description",
            "statut", "created_at", "resolved_at",
        ]
        read_only_fields = ["locataire", "statut", "created_at", "resolved_at"]

    def create(self, validated_data):
        validated_data["locataire"] = self.context["request"].user
        return super().create(validated_data)
