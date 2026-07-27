# Patch `map.service.ts` — Cohérence visuelle des fonds de carte

## Problème corrigé
- Vue **Plan** : tuiles OSM raster basse résolution, palette jaune/verte "cartoon"
- Vue **Satellite/Hybride** : tuiles Esri OK mais labels aux couleurs criardes et incohérentes

## Solution : 3 changements dans `map.service.ts`

---

### 1. Constantes de tuiles (remplacer les URL existantes)

```typescript
// ── FONDS DE CARTE ──────────────────────────────────────────────────────────
// Plan : CARTO Voyager — vectoriel, toujours net, palette proche Google Maps,
//        gratuit sans clé API (fair-use, usage raisonnable)
const TUILES_PLAN =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const ATTRIBUTION_PLAN =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

// Satellite : Esri World Imagery (haute résolution, pas de clé requise)
const TUILES_SATELLITE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION_SATELLITE =
  'Tiles &copy; Esri — Source: Esri, USGS, NGA, NASA, CGIAR, N Robinson, NCEAS, NLS, OS, NMA, Geodatastyrelsen, Rika och Lantmäteriet and the GIS User Community';

// Hybride = satellite + labels CARTO (sobres, cohérents avec la palette Voyager)
// Deux couches superposées : imagerie Esri en dessous, labels CARTO en dessus
const TUILES_LABELS_HYBRIDE =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';
const ATTRIBUTION_LABELS =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';
```

---

### 2. Méthode `initialiserCarte` — remplacer la création du layer Plan

Chercher la ligne qui crée la couche Plan (souvent `L.tileLayer('https://tile.openstreetmap.org/...'`) et remplacer par :

```typescript
// Plan — CARTO Voyager (vectoriel rendu en raster, toujours net)
case 'plan':
default:
  return L.tileLayer(TUILES_PLAN, {
    attribution: ATTRIBUTION_PLAN,
    subdomains: 'abcd',
    maxZoom: 20,
  });
```

---

### 3. Méthode `changerFondDeCarte` (ou la factory de layers)

Remplacer entièrement le switch/if qui crée les couches par :

```typescript
private creerCouche(fond: FondDeCarte): L.TileLayer | L.LayerGroup {
  switch (fond) {

    case 'plan':
      // CARTO Voyager — net à tous niveaux de zoom, palette sobre
      return L.tileLayer(TUILES_PLAN, {
        attribution: ATTRIBUTION_PLAN,
        subdomains: 'abcd',
        maxZoom: 20,
      });

    case 'satellite':
      // Esri World Imagery avec filtre "punchy" (contraste + saturation renforcés)
      return L.tileLayer(TUILES_SATELLITE, {
        attribution: ATTRIBUTION_SATELLITE,
        maxZoom: 19,
        // Filtre CSS appliqué directement sur le canvas des tuiles
        className: 'tuiles-satellite',
      });

    case 'hybride':
      // Satellite Esri + labels CARTO sobres en overlay
      const satellite = L.tileLayer(TUILES_SATELLITE, {
        attribution: ATTRIBUTION_SATELLITE,
        maxZoom: 19,
        className: 'tuiles-satellite',
      });
      const labels = L.tileLayer(TUILES_LABELS_HYBRIDE, {
        attribution: ATTRIBUTION_LABELS,
        subdomains: 'abcd',
        maxZoom: 20,
        // Opacité légèrement réduite pour que les labels restent lisibles sans dominer
        opacity: 0.9,
      });
      return L.layerGroup([satellite, labels]);

    default:
      return L.tileLayer(TUILES_PLAN, {
        attribution: ATTRIBUTION_PLAN,
        subdomains: 'abcd',
        maxZoom: 20,
      });
  }
}
```

> **Note** : si votre code actuel utilise `L.tileLayer` directement dans `changerFondDeCarte` sans factory, restructurez-le autour de cette méthode privée `creerCouche()` et appelez-la à la fois dans `initialiserCarte` et dans `changerFondDeCarte`.

---

### 4. CSS global (à ajouter dans `styles.css` ou `map.component.css`)

Le filtre CSS renforce le contraste/saturation des tuiles satellite sans toucher aux autres éléments :

```css
/* ── Satellite : rendu "punchy" (contraste et couleurs renforcés) ── */
.tuiles-satellite img,
.tuiles-satellite canvas {
  filter: contrast(1.08) saturate(1.18) brightness(0.97);
}

/* ── Labels hybride : texte neutre, lisible sur imagerie sombre ── */
/* Les labels CARTO Voyager sont déjà sobres — pas de filtre nécessaire */
/* Si besoin d'augmenter la lisibilité sur fond sombre : */
.leaflet-tile-pane .leaflet-layer:last-child img {
  /* rien par défaut ; décommentez si les labels semblent pâles */
  /* filter: contrast(1.1) brightness(1.05); */
}
```

---

## Résultat attendu

| Vue       | Rendu                                                                 |
|-----------|-----------------------------------------------------------------------|
| Plan      | Vectoriel net, palette gris/blanc proche Google Maps, labels français |
| Satellite | Photo Esri HD, couleurs légèrement renforcées, propre                 |
| Hybride   | Photo Esri + labels CARTO sobres et cohérents avec le Plan            |

## Pourquoi CARTO Voyager ?

- **Gratuit sans clé API** pour usage raisonnable (< ~75 000 tuiles/jour)
- **Raster haute densité** (`{r}` = `@2x` sur écrans Retina) → jamais pixelisé
- **Subdomains `abcd`** → 4 serveurs parallèles, chargement rapide
- Palette neutre très proche de Google Maps, compatible avec votre UI crème/terre
