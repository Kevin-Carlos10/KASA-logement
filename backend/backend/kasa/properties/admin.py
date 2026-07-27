from django.contrib import admin

from .models import ElectricityInfo, PriceHistory, Property, PropertyPhoto, Quartier, WaterInfo


class PropertyPhotoInline(admin.TabularInline):
    model = PropertyPhoto
    extra = 1


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("type_logement", "quartier", "prix", "is_verified", "is_active", "date_publication")
    list_filter = ("type_logement", "is_verified", "is_active", "quartier__ville")
    inlines = [PropertyPhotoInline]


admin.site.register(Quartier)
admin.site.register(WaterInfo)
admin.site.register(ElectricityInfo)
admin.site.register(PriceHistory)
