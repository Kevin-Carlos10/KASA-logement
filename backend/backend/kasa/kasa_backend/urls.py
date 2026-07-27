from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/properties/', include('properties.urls')),
    path('api/users/', include('users.urls')),
    path('api/artisans/', include('artisans.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/visits/', include('visits.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
