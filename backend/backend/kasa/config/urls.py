"""URLs racine du projet KaSa."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

schema_view = get_schema_view(
    openapi.Info(
        title="KaSa API",
        default_version="v1",
        description="API REST de la plateforme de location transparente KaSa",
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/users/", include("users.urls")),
    path("api/properties/", include("properties.urls")),
    path("api/reviews/", include("reviews.urls")),
    path("api/visits/", include("visits.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/finance/", include("finance.urls")),
    path("api/artisans/", include("artisans.urls")),

    path("api/docs/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
    path("api/redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
