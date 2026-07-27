from decimal import Decimal, InvalidOperation
from math import asin, cos, radians, sin, sqrt

from django.db.models import Avg, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ElectricityInfo, PriceHistory, Property, Quartier, WaterInfo
from .serializers import (
    ElectricityInfoSerializer,
    PriceHistorySerializer,
    PropertyDetailSerializer,
    PropertyListSerializer,
    QuartierSerializer,
    WaterInfoSerializer,
)


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))


class QuartierViewSet(viewsets.ModelViewSet):
    """Cartographie avancée : limites des quartiers et arrondissements."""

    queryset = Quartier.objects.all()
    serializer_class = QuartierSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["nom", "ville", "arrondissement"]


class PropertyViewSet(viewsets.ModelViewSet):
    """Annonces de logements : recherche par quartier/ville/prix, proximité,
    et données de marché."""

    queryset = Property.objects.filter(is_active=True).select_related("quartier")
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "quartier": ["exact"],
        "quartier__ville": ["exact"],
        "prix": ["gte", "lte"],
        "type_logement": ["exact"],
        "acces_goudron": ["exact"],
        "is_verified": ["exact"],
    }
    search_fields = ["quartier__nom", "quartier__ville", "type_logement"]
    ordering_fields = ["prix", "date_publication", "surface_m2"]

    def get_serializer_class(self):
        return PropertyDetailSerializer if self.action in ("retrieve", "create", "update", "partial_update") else PropertyListSerializer

    @action(detail=False, methods=["get"])
    def proximite(self, request):
        """Recherche par proximité : ?lat=..&lng=..&rayon_km=5"""
        try:
            lat, lng = float(request.query_params["lat"]), float(request.query_params["lng"])
        except (KeyError, ValueError):
            return Response({"detail": "Paramètres 'lat' et 'lng' requis."}, status=400)
        rayon_km = float(request.query_params.get("rayon_km", 5))

        results = []
        for prop in self.get_queryset():
            distance = haversine_km(lat, lng, prop.latitude, prop.longitude)
            if distance <= rayon_km:
                data = PropertyListSerializer(prop, context={"request": request}).data
                data["distance_km"] = round(distance, 2)
                results.append(data)
        results.sort(key=lambda r: r["distance_km"])
        return Response(results)

    @action(detail=True, methods=["get"], url_path="distance")
    def distance_a_un_lieu(self, request, pk=None):
        """Distance exacte entre le logement et un lieu donné : ?lat=..&lng=.."""
        prop = self.get_object()
        try:
            lat, lng = float(request.query_params["lat"]), float(request.query_params["lng"])
        except (KeyError, ValueError):
            return Response({"detail": "Paramètres 'lat' et 'lng' requis."}, status=400)
        return Response({"distance_km": round(haversine_km(prop.latitude, prop.longitude, lat, lng), 2)})

    @action(detail=True, methods=["patch"])
    def changer_prix(self, request, pk=None):
        """Met à jour le prix et journalise l'historique avec justification."""
        prop = self.get_object()
        nouveau_prix = request.data.get("nouveau_prix")
        justification = request.data.get("justification", "")
        if nouveau_prix is None:
            return Response({"detail": "'nouveau_prix' requis."}, status=400)
        try:
            nouveau_prix = Decimal(str(nouveau_prix))
        except InvalidOperation:
            return Response({"detail": "'nouveau_prix' doit être un nombre."}, status=400)
        PriceHistory.objects.create(
            property=prop, ancien_prix=prop.prix, nouveau_prix=nouveau_prix,
            justification=justification, changed_by=request.user,
        )
        prop.prix = nouveau_prix
        prop.save(update_fields=["prix"])
        return Response(PropertyDetailSerializer(prop, context={"request": request}).data)


class WaterInfoViewSet(viewsets.ModelViewSet):
    queryset = WaterInfo.objects.all()
    serializer_class = WaterInfoSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class ElectricityInfoViewSet(viewsets.ModelViewSet):
    queryset = ElectricityInfo.objects.all()
    serializer_class = ElectricityInfoSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class MarketDataView(viewsets.ViewSet):
    """2. Données de marché pour le locataire : prix moyen par type/zone,
    évolution des prix dans le temps."""

    permission_classes = [permissions.AllowAny]

    def list(self, request):
        qs = Property.objects.filter(is_active=True)
        par_quartier_type = (
            qs.values("quartier__nom", "type_logement")
            .annotate(prix_moyen=Avg("prix"), nombre_annonces=Count("id"))
            .order_by("quartier__nom", "type_logement")
        )
        evolution = (
            PriceHistory.objects.values("property__quartier__nom", "changed_at__date")
            .annotate(prix_moyen=Avg("nouveau_prix"))
            .order_by("changed_at__date")
        )
        return Response({
            "prix_moyen_par_zone_et_type": list(par_quartier_type),
            "evolution_prix": list(evolution),
        })
