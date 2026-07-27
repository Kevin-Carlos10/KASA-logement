from rest_framework.routers import DefaultRouter

from .views import VisitViewSet

router = DefaultRouter()
router.register("visites", VisitViewSet, basename="visite")

urlpatterns = router.urls
