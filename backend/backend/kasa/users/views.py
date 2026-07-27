from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AgentTerrainProfile, User
from .serializers import AgentTerrainProfileSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """Inscription d'un nouvel utilisateur (locataire, bailleur, agent ou artisan)."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    """Profil de l'utilisateur connecté."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AgentTerrainViewSet(viewsets.ReadOnlyModelViewSet):
    """Liste des agents terrain avec leur note de confiance (réputation)."""

    queryset = AgentTerrainProfile.objects.select_related("user").all()
    serializer_class = AgentTerrainProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
