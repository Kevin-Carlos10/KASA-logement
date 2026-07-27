from rest_framework.routers import DefaultRouter

from .views import AgentTerrainRatingViewSet, TenantReviewViewSet

router = DefaultRouter()
router.register("notes-agents", AgentTerrainRatingViewSet, basename="agent-rating")
router.register("avis-locataires", TenantReviewViewSet, basename="tenant-review")

urlpatterns = router.urls
