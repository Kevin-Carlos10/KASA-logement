from rest_framework.routers import DefaultRouter

from .views import ElectricityInfoViewSet, MarketDataView, PropertyViewSet, QuartierViewSet, WaterInfoViewSet

router = DefaultRouter()
router.register("logements", PropertyViewSet, basename="logement")
router.register("quartiers", QuartierViewSet, basename="quartier")
router.register("eau", WaterInfoViewSet, basename="water-info")
router.register("electricite", ElectricityInfoViewSet, basename="electricity-info")
router.register("donnees-marche", MarketDataView, basename="market-data")

urlpatterns = router.urls
