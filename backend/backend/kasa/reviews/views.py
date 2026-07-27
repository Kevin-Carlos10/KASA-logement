from rest_framework import permissions, viewsets

from .models import AgentTerrainRating, TenantReview
from .serializers import AgentTerrainRatingSerializer, TenantReviewSerializer


class AgentTerrainRatingViewSet(viewsets.ModelViewSet):
    queryset = AgentTerrainRating.objects.all()
    serializer_class = AgentTerrainRatingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class TenantReviewViewSet(viewsets.ModelViewSet):
    queryset = TenantReview.objects.all()
    serializer_class = TenantReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["property"]
