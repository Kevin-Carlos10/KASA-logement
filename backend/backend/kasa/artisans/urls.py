from rest_framework.routers import DefaultRouter

from .views import (
    ArtisanProfileViewSet,
    ArtisanReviewViewSet,
    MetierViewSet,
    PrestationViewSet,
    ServicePaymentViewSet,
    ServiceRequestViewSet,
)

router = DefaultRouter()
router.register("metiers", MetierViewSet, basename="metier")
router.register("prestations", PrestationViewSet, basename="prestation")
router.register("artisans", ArtisanProfileViewSet, basename="artisan")
router.register("demandes-service", ServiceRequestViewSet, basename="service-request")
router.register("paiements-service", ServicePaymentViewSet, basename="service-payment")
router.register("avis-artisans", ArtisanReviewViewSet, basename="artisan-review")

urlpatterns = router.urls
