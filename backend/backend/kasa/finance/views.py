from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import AlternativeDepositSubscription, BudgetSimulation, DepositSavings, RentPayment, RentalContract
from .serializers import (
    AlternativeDepositSubscriptionSerializer,
    BudgetSimulationSerializer,
    DepositSavingsSerializer,
    RentPaymentSerializer,
    RentalContractSerializer,
)


class RentalContractViewSet(viewsets.ModelViewSet):
    queryset = RentalContract.objects.all()
    serializer_class = RentalContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["property", "locataire", "is_active"]


class RentPaymentViewSet(viewsets.ModelViewSet):
    """Paiement mensuel digitalisé du loyer."""

    queryset = RentPayment.objects.all()
    serializer_class = RentPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["contrat", "statut"]

    @action(detail=True, methods=["post"])
    def payer(self, request, pk=None):
        paiement = self.get_object()
        paiement.statut = "paye"
        paiement.paid_at = timezone.now()
        paiement.reference_transaction = request.data.get("reference_transaction", "")
        paiement.save(update_fields=["statut", "paid_at", "reference_transaction"])
        return Response(RentPaymentSerializer(paiement).data)


class DepositSavingsViewSet(viewsets.ModelViewSet):
    """Épargne automatique + restitution de la caution."""

    queryset = DepositSavings.objects.all()
    serializer_class = DepositSavingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["contrat", "statut"]

    @action(detail=True, methods=["post"])
    def cotiser(self, request, pk=None):
        epargne = self.get_object()
        montant = request.data.get("montant")
        if montant is None:
            return Response({"detail": "'montant' requis."}, status=400)
        epargne.montant_epargne = min(epargne.montant_epargne + int(montant), epargne.montant_cible)
        if epargne.montant_epargne >= epargne.montant_cible:
            epargne.statut = "complete"
        epargne.save()
        return Response(DepositSavingsSerializer(epargne).data)

    @action(detail=True, methods=["post"])
    def restituer(self, request, pk=None):
        """Restitution équitable et garantie de la caution en fin de location."""
        epargne = self.get_object()
        montant_retenu = int(request.data.get("montant_retenu", 0))
        motif = request.data.get("motif_retenue", "")
        epargne.montant_restitue = epargne.montant_epargne - montant_retenu
        epargne.motif_retenue = motif
        epargne.statut = "retenue" if montant_retenu > 0 else "restituee"
        epargne.save()
        return Response(DepositSavingsSerializer(epargne).data)


class AlternativeDepositSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = AlternativeDepositSubscription.objects.all()
    serializer_class = AlternativeDepositSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["contrat", "is_active"]

    @action(detail=True, methods=["post"])
    def cotiser(self, request, pk=None):
        sub = self.get_object()
        sub.montant_verse += sub.cotisation_mensuelle
        sub.save(update_fields=["montant_verse"])
        return Response(AlternativeDepositSubscriptionSerializer(sub).data)


class BudgetSimulationViewSet(viewsets.ModelViewSet):
    """Simulateur de budget avec suggestions d'annonces adaptées."""

    queryset = BudgetSimulation.objects.all()
    serializer_class = BudgetSimulationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return super().get_queryset().filter(locataire=self.request.user)
