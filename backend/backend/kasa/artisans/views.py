from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from properties.views import haversine_km

from .models import ArtisanProfile, ArtisanReview, Metier, Prestation, ServicePayment, ServiceRequest
from .serializers import (
    ArtisanProfileSerializer,
    ArtisanReviewSerializer,
    MetierSerializer,
    PrestationSerializer,
    ServicePaymentSerializer,
    ServiceRequestSerializer,
)


class MetierViewSet(viewsets.ModelViewSet):
    queryset = Metier.objects.all()
    serializer_class = MetierSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class PrestationViewSet(viewsets.ModelViewSet):
    queryset = Prestation.objects.all()
    serializer_class = PrestationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["metier"]


class ArtisanProfileViewSet(viewsets.ModelViewSet):
    queryset = ArtisanProfile.objects.select_related("user", "metier")
    serializer_class = ArtisanProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["metier", "quartier", "is_verified"]


class ServiceRequestViewSet(viewsets.ModelViewSet):
    """Mise en relation : le locataire indique son besoin et sa position,
    l'artisan disponible le plus proche et le mieux noté est proposé."""

    queryset = ServiceRequest.objects.select_related("metier", "artisan", "artisan__user")
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["metier", "statut", "locataire"]

    @action(detail=True, methods=["post"], url_path="assigner-artisan")
    def assigner_artisan(self, request, pk=None):
        """Trouve l'artisan disponible le plus proche et le mieux noté,
        puis bascule vers WhatsApp."""
        demande = self.get_object()
        candidats = ArtisanProfile.objects.filter(metier=demande.metier, is_verified=True)

        meilleur, meilleure_note_distance = None, None
        for artisan in candidats:
            distance = haversine_km(demande.latitude, demande.longitude, artisan.latitude, artisan.longitude)
            # score : priorité à la proximité, départage par la note
            score = (round(distance, 1), -float(artisan.note_moyenne))
            if meilleure_note_distance is None or score < meilleure_note_distance:
                meilleur, meilleure_note_distance = artisan, score

        if not meilleur:
            return Response({"detail": "Aucun artisan disponible pour ce métier."}, status=404)

        demande.artisan = meilleur
        demande.statut = "assignee"
        demande.save(update_fields=["artisan", "statut"])
        return Response({
            "service_request": ServiceRequestSerializer(demande).data,
            "whatsapp_message": (
                f"Besoin d'un {demande.metier.nom} à la position "
                f"({demande.latitude}, {demande.longitude}) : {demande.description_besoin}"
            ),
        })

    @action(detail=True, methods=["post"])
    def valider(self, request, pk=None):
        """Le locataire valide l'intervention comme bien exécutée -
        déclenche l'obligation de paiement."""
        demande = self.get_object()
        demande.statut = "validee"
        demande.validated_at = timezone.now()
        demande.prix_convenu = request.data.get("prix_convenu", demande.prix_convenu)
        demande.save(update_fields=["statut", "validated_at", "prix_convenu"])
        if demande.artisan:
            demande.artisan.nombre_interventions += 1
            demande.artisan.save(update_fields=["nombre_interventions"])
        return Response(ServiceRequestSerializer(demande).data)


class ServicePaymentViewSet(viewsets.ModelViewSet):
    """Paiement obligatoire, tracé, une fois l'intervention validée."""

    queryset = ServicePayment.objects.all()
    serializer_class = ServicePaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        service_request = serializer.validated_data["service_request"]
        if service_request.statut != "validee":
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Le paiement n'est possible qu'après validation de l'intervention.")
        serializer.save(paid_at=timezone.now())


class ArtisanReviewViewSet(viewsets.ModelViewSet):
    queryset = ArtisanReview.objects.all()
    serializer_class = ArtisanReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
