from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AgentTerrainProfile, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "phone_number", "is_locataire", "is_bailleur", "is_agent_terrain", "is_artisan", "identity_verified")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("KaSa", {"fields": ("phone_number", "whatsapp_number", "is_locataire", "is_bailleur", "is_agent_terrain", "is_artisan", "identity_verified", "quartier", "ville")}),
    )


@admin.register(AgentTerrainProfile)
class AgentTerrainProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "zones_couvertes", "trust_score", "total_visites")
