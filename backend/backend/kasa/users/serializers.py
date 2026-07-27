from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import AgentTerrainProfile, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "phone_number", "whatsapp_number",
            "is_locataire", "is_bailleur", "is_agent_terrain", "is_artisan",
            "identity_verified", "quartier", "ville", "created_at",
        ]
        read_only_fields = ["id", "identity_verified", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            "username", "email", "password", "phone_number", "whatsapp_number",
            "is_locataire", "is_bailleur", "is_agent_terrain", "is_artisan",
            "quartier", "ville",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AgentTerrainProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AgentTerrainProfile
        fields = ["id", "user", "zones_couvertes", "trust_score", "total_visites"]
        read_only_fields = ["trust_score", "total_visites"]
