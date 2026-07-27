from rest_framework.routers import DefaultRouter

from .views import ReportViewSet

router = DefaultRouter()
router.register("signalements", ReportViewSet, basename="signalement")

urlpatterns = router.urls
