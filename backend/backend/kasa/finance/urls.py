from rest_framework.routers import DefaultRouter

from .views import (
    AlternativeDepositSubscriptionViewSet,
    BudgetSimulationViewSet,
    DepositSavingsViewSet,
    RentPaymentViewSet,
    RentalContractViewSet,
)

router = DefaultRouter()
router.register("contrats", RentalContractViewSet, basename="contrat")
router.register("paiements-loyer", RentPaymentViewSet, basename="rent-payment")
router.register("epargne-caution", DepositSavingsViewSet, basename="deposit-savings")
router.register("caution-alternative", AlternativeDepositSubscriptionViewSet, basename="alt-deposit")
router.register("simulateur-budget", BudgetSimulationViewSet, basename="budget-simulation")

urlpatterns = router.urls
