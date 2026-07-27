from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Report
from .serializers import ReportSerializer


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["property", "statut", "type_signalement"]

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def resoudre(self, request, pk=None):
        report = self.get_object()
        report.statut = "resolu"
        report.resolved_at = timezone.now()
        report.save(update_fields=["statut", "resolved_at"])
        return Response(ReportSerializer(report).data)
