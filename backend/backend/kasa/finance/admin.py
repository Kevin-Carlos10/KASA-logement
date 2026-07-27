from django.contrib import admin

from .models import AlternativeDepositSubscription, BudgetSimulation, DepositSavings, RentPayment, RentalContract

admin.site.register(RentalContract)
admin.site.register(RentPayment)
admin.site.register(DepositSavings)
admin.site.register(AlternativeDepositSubscription)
admin.site.register(BudgetSimulation)
