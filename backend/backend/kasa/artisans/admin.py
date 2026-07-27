from django.contrib import admin

from .models import ArtisanProfile, ArtisanReview, Metier, Prestation, ServicePayment, ServiceRequest


@admin.register(ArtisanProfile)
class ArtisanProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "metier", "quartier", "is_verified", "note_moyenne", "nombre_interventions")
    list_filter = ("metier", "is_verified")


admin.site.register(Metier)
admin.site.register(Prestation)
admin.site.register(ServiceRequest)
admin.site.register(ServicePayment)
admin.site.register(ArtisanReview)
