from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("type_signalement", "property", "locataire", "statut", "created_at")
    list_filter = ("type_signalement", "statut")
