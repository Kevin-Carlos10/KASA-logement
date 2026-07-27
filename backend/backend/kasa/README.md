# KaSa — Backend Django

Backend Django REST Framework pour la plateforme **KaSa** (location de
logements au Burkina Faso).

État actuel : **API en lecture seule** (GET), **sans authentification**,
**PostgreSQL + PostGIS** (GeoDjango) pour les données géographiques.

> À ce stade, `Logement` est lié directement à `Agent` (l'agent terrain
> qui gère/visite le bien) et à `Quartier`. La réputation "propriétaire"
> séparée (`Hote`) n'est pas encore réactivée — prévue pour une phase
> ultérieure.

## 1. Prérequis système (GeoDjango)

En plus de PostgreSQL, GeoDjango a besoin de librairies système
(non installables via pip) :

```bash
# Ubuntu/Debian
sudo apt install gdal-bin libgdal-dev libgeos-dev libproj-dev postgis

# macOS (Homebrew)
brew install gdal geos proj postgis
```

## 2. Installation

```bash
python3 -m venv venv
source venv/bin/activate          # Windows : venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# éditer .env avec vos identifiants PostgreSQL
```

Créer la base PostgreSQL **et activer PostGIS** :

```bash
psql -c "CREATE DATABASE kasa_db;"
psql -c "CREATE USER kasa_user WITH PASSWORD 'kasa_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE kasa_db TO kasa_user;"
psql -d kasa_db -c "CREATE EXTENSION postgis;"
```

## 3. Migrations et données de démo

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Données géographiques (villes, quartiers, points d'intérêt) — géométries PostGIS réelles
python manage.py seed_carte

# Un logement de démonstration complet (certification, avis, notes, etc.)
python manage.py seed_logements
```

## 4. Lancer le serveur

```bash
python manage.py runserver
```

- API : http://127.0.0.1:8000/api/
- Admin (avec widgets carte OpenLayers) : http://127.0.0.1:8000/admin/

## 5. Endpoints principaux

Toutes les réponses JSON sont automatiquement converties en **camelCase**
(`djangorestframework-camel-case`) pour matcher les interfaces
TypeScript Angular.

### Logements

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/logements/` | Liste des logements (paginée), filtrable |
| GET | `/api/logements/{id}/` | Détail complet d'un logement |
| GET | `/api/logements/carte/` | Logements au format `PointCarte` (marqueurs) |

**Filtres** (query params) : `texte`, `typeBien`, `prixMax`,
`nombreChambresMin`, `disponibiliteEau`, `disponibiliteElectricite`,
`annonceCertifiee`, `quartier` (slug), `ville` (slug), `typeLocation`,
`agent` (UUID), ainsi que `nord`, `sud`, `est`, `ouest` (bounding box carte,
via PostGIS).

**Distance réelle (PostGIS)** : ajouter `?lat=...&lng=...` pour annoter
chaque logement avec `distanceM` (mètres, calcul ellipsoïdal réel) ;
combiner avec `?ordering=distance_m` pour trier "du plus proche au plus
loin".

Recherche libre : `?search=...` · Tri : `?ordering=prix` / `-prix` / `-scoreConfiance` ...

Exemple :
```
GET /api/logements/?typeBien=Appartement&prixMax=60000&lat=12.37&lng=-1.52&ordering=distance_m
```

### Agents (agents terrain)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/agents/` | Liste des agents terrain |
| GET | `/api/agents/{id}/` | Détail d'un agent |

### Images

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/photos/?logement={id}` | Images d'un logement |

### Carte

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/carte/quartiers/` | Quartiers (polygone PostGIS + statistiques) |
| GET | `/api/carte/villes/` | Villes (vue nationale) |
| GET | `/api/carte/points-interet/?categorie=hopital` | Points d'intérêt |
| GET | `/api/carte/couches/` | Config. des couches du panneau « Afficher » |
| GET | `/api/carte/lieux-reference/` | Lieux de référence (proximité) |
| GET | `/api/carte/lieux-reference/{id}/resultat_proximite/` | Logements dans le rayon (PostGIS `dwithin`) |

## 6. Structure du projet

```
kasa_backend/
├── kasa_backend/       # settings, urls racine
├── logements/          # Logement, InfoEau/Électricité, avis, notes agent, historique, signalement...
├── agents/             # Agent terrain
├── photos/             # Image — galerie photo d'un logement
├── carte/              # Quartier, Ville (PostGIS), PointInteret, LieuReference
```

## 7. Prochaines étapes possibles

- Réintroduire un modèle `Hote` (propriétaire) + réputation dédiée,
  découplé de `Agent` (terrain)
- Authentification JWT pour activer la création/modification
- Upload direct des images/factures/vidéos (actuellement stockées comme URLs)
- Recalcul automatique des statistiques de zone à partir des logements
  réels (tâche planifiée) au lieu des valeurs saisies manuellement
