"""
Jeu de données de démonstration pour KaSa.

Idempotent : relançable sans créer de doublons (get_or_create partout).
Usage :
    python manage.py seed_demo
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from artisans.models import ArtisanProfile, Metier, Prestation
from properties.models import (
    ElectricityInfo,
    PriceHistory,
    Property,
    Quartier,
    WaterInfo,
)
from reviews.models import AgentTerrainRating, TenantReview
from users.models import AgentTerrainProfile
from visits.models import Visit

User = get_user_model()

MDP_DEMO = "kasa1234"


class Command(BaseCommand):
    help = "Peuple la base avec des données de démonstration (Ouagadougou)."

    def handle(self, *args, **options):
        self.stdout.write("- Création des quartiers…")
        quartiers = {}
        for nom, ville, arr in [
            ("Ouaga 2000", "Ouagadougou", "Arrondissement 12"),
            ("Kalgondin", "Ouagadougou", "Arrondissement 4"),
            ("Zogona", "Ouagadougou", "Arrondissement 3"),
            ("Tanghin", "Ouagadougou", "Arrondissement 4"),
            ("Gounghin", "Ouagadougou", "Arrondissement 6"),
        ]:
            q, _ = Quartier.objects.get_or_create(
                nom=nom, ville=ville, defaults={"arrondissement": arr}
            )
            quartiers[nom] = q

        self.stdout.write("- Création des utilisateurs…")
        bailleur = self._user(
            "saidou", "saidou@kasa.bf", "+22670000001",
            is_bailleur=True, quartier="Ouaga 2000", ville="Ouagadougou",
            first_name="Saidou", last_name="Compaoré",
        )
        agent = self._user(
            "boureima", "boureima@kasa.bf", "+22670000002",
            is_agent_terrain=True, quartier="Zogona", ville="Ouagadougou",
            first_name="Boureima", last_name="Sawadogo",
        )
        locataire = self._user(
            "aicha", "aicha@kasa.bf", "+22670000003",
            is_locataire=True, quartier="Tanghin", ville="Ouagadougou",
            first_name="Aïcha", last_name="Kaboré",
        )
        artisan_user = self._user(
            "issouf", "issouf@kasa.bf", "+22670000004",
            is_artisan=True, quartier="Gounghin", ville="Ouagadougou",
            first_name="Issouf", last_name="Ouédraogo",
        )

        agent_profile, _ = AgentTerrainProfile.objects.get_or_create(
            user=agent,
            defaults={"zones_couvertes": "Zogona, Tanghin, Ouaga 2000"},
        )

        self.stdout.write("- Création des logements…")
        demo_props = [
            dict(
                type_logement="villa", quartier="Ouaga 2000", prix=Decimal("1000000"),
                surface=Decimal("180"), chambres=4, lat=Decimal("12.344700"),
                lng=Decimal("-1.456900"), goudron=True, verifie=True,
                eau=("individuel", True), elec=("individuel", "classique"),
                conditions="Caution 2 mois + avance 3 mois",
            ),
            dict(
                type_logement="studio", quartier="Kalgondin", prix=Decimal("40000"),
                surface=Decimal("28"), chambres=1, lat=Decimal("12.383000"),
                lng=Decimal("-1.510000"), goudron=False, verifie=True,
                eau=("partage", True), elec=("individuel", "cash_power"),
                conditions="Caution 1 mois + avance 2 mois",
            ),
            dict(
                type_logement="appartement", quartier="Zogona", prix=Decimal("150000"),
                surface=Decimal("75"), chambres=2, lat=Decimal("12.372000"),
                lng=Decimal("-1.497000"), goudron=True, verifie=True,
                eau=("individuel", True), elec=("individuel", "cash_power"),
                conditions="Caution 2 mois + avance 2 mois",
            ),
            dict(
                type_logement="chambre_salon", quartier="Tanghin", prix=Decimal("60000"),
                surface=Decimal("40"), chambres=1, lat=Decimal("12.400000"),
                lng=Decimal("-1.505000"), goudron=False, verifie=False,
                eau=("partage", True), elec=("partage", "cash_power"),
                conditions="Caution 1 mois + avance 1 mois",
            ),
            dict(
                type_logement="villa", quartier="Ouaga 2000", prix=Decimal("750000"),
                surface=Decimal("150"), chambres=3, lat=Decimal("12.340000"),
                lng=Decimal("-1.460000"), goudron=True, verifie=True,
                eau=("individuel", True), elec=("individuel", "classique"),
                conditions="Caution 3 mois + avance 3 mois",
            ),
            dict(
                type_logement="maison_cour_commune", quartier="Gounghin", prix=Decimal("35000"),
                surface=Decimal("22"), chambres=1, lat=Decimal("12.360000"),
                lng=Decimal("-1.540000"), goudron=False, verifie=False,
                eau=("partage", True), elec=("partage", "cash_power"),
                conditions="Avance 2 mois",
            ),
        ]

        props = []
        for d in demo_props:
            prop, created = Property.objects.get_or_create(
                bailleur=bailleur,
                quartier=quartiers[d["quartier"]],
                type_logement=d["type_logement"],
                prix=d["prix"],
                defaults=dict(
                    agent_terrain=agent,
                    conditions_location=d["conditions"],
                    latitude=d["lat"],
                    longitude=d["lng"],
                    surface_m2=d["surface"],
                    acces_goudron=d["goudron"],
                    is_verified=d["verifie"],
                    video_url="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
                ),
            )
            props.append(prop)
            if not created:
                continue

            compteur_eau, dispo_eau = d["eau"]
            WaterInfo.objects.get_or_create(
                property=prop,
                defaults=dict(
                    disponible=dispo_eau,
                    type_compteur=compteur_eau,
                    derniere_facture_onea="factures/onea_demo.pdf",
                    frequence_coupures="rarement",
                ),
            )
            compteur_elec, type_alim = d["elec"]
            elec_defaults = dict(
                disponible=True,
                type_compteur=compteur_elec,
                type_alimentation=type_alim,
            )
            if type_alim == "cash_power":
                elec_defaults["montant_moyen_redevance"] = Decimal("15000")
            else:
                elec_defaults["derniere_facture_sonabel"] = "factures/sonabel_demo.pdf"
            ElectricityInfo.objects.get_or_create(property=prop, defaults=elec_defaults)

            # Un historique de prix (révision à la baisse)
            PriceHistory.objects.get_or_create(
                property=prop,
                ancien_prix=d["prix"] + Decimal("50000"),
                nouveau_prix=d["prix"],
                defaults=dict(justification="Révision à la baisse", changed_by=bailleur),
            )

        self.stdout.write("- Avis locataires & notes agent…")
        for prop in props[:3]:
            TenantReview.objects.get_or_create(
                property=prop,
                locataire=locataire,
                defaults=dict(
                    eau_disponible=True,
                    courant_disponible=True,
                    securite_quartier=4,
                    respect_bailleur=5,
                    qualite_voisinage=4,
                    proprete=5,
                    commentaire="Logement conforme à l'annonce, agent professionnel.",
                ),
            )
        AgentTerrainRating.objects.get_or_create(
            agent=agent,
            locataire=locataire,
            defaults=dict(
                qualite_accompagnement=5,
                ponctualite=4,
                exactitude_informations=5,
                comportement_professionnel=5,
                commentaire="Très bon accompagnement lors de la visite.",
            ),
        )

        self.stdout.write("- Visites…")
        Visit.objects.get_or_create(
            property=props[0],
            visiteur=locataire,
            agent=agent,
            date_visite=timezone.now() + timedelta(days=2),
            defaults=dict(statut="confirmee"),
        )

        self.stdout.write("- Artisans (métiers, prestations, profil)…")
        plomberie, _ = Metier.objects.get_or_create(nom="Plomberie")
        electricite, _ = Metier.objects.get_or_create(nom="Électricité")
        Prestation.objects.get_or_create(
            metier=plomberie, nom="Réparation fuite robinet",
            defaults=dict(type_tarification="forfait", prix_reference=Decimal("5000")),
        )
        Prestation.objects.get_or_create(
            metier=electricite, nom="Installation prise",
            defaults=dict(type_tarification="forfait", prix_reference=Decimal("7500")),
        )
        ArtisanProfile.objects.get_or_create(
            user=artisan_user,
            defaults=dict(
                metier=plomberie,
                quartier="Gounghin",
                latitude=Decimal("12.360000"),
                longitude=Decimal("-1.540000"),
                whatsapp_number="+22670000004",
                is_verified=True,
                nombre_interventions=17,
                note_moyenne=Decimal("4.60"),
            ),
        )

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Seed terminé : {Property.objects.count()} logements, "
            f"{User.objects.count()} utilisateurs, {Quartier.objects.count()} quartiers.\n"
            f"   Comptes démo (mot de passe : {MDP_DEMO}) : "
            f"saidou (bailleur), boureima (agent), aicha (locataire), issouf (artisan)."
        ))

    def _user(self, username, email, phone, **flags):
        first_name = flags.pop("first_name", "")
        last_name = flags.pop("last_name", "")
        user, created = User.objects.get_or_create(
            username=username,
            defaults=dict(
                email=email,
                phone_number=phone,
                first_name=first_name,
                last_name=last_name,
                **flags,
            ),
        )
        if created:
            user.set_password(MDP_DEMO)
            user.save()
        return user
