from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Visit
from .serializers import VisitSerializer


class VisitViewSet(viewsets.ModelViewSet):
    """Réservation de visite accompagnée par un agent terrain."""

    queryset = Visit.objects.all()
    serializer_class = VisitSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["property", "statut", "agent"]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_agent_terrain and not user.is_staff:
            return qs.filter(agent=user)
        if not user.is_staff:
            return qs.filter(visiteur=user)
        return qs

    @action(detail=True, methods=["post"])
    def confirmer(self, request, pk=None):
        visite = self.get_object()
        visite.statut = "confirmee"
        visite.save(update_fields=["statut"])
        return Response(VisitSerializer(visite).data)

    @action(detail=True, methods=["post"])
    def marquer_effectuee(self, request, pk=None):
        visite = self.get_object()
        visite.statut = "effectuee"
        visite.save(update_fields=["statut"])
        return Response(VisitSerializer(visite).data)
