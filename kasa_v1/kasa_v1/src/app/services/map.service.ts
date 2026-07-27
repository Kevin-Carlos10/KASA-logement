import { Injectable, OnDestroy } from '@angular/core';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { GeoJSONSource, Map as MapLibreMap, Marker, Popup, StyleSpecification } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  Coordonnees,
  FondDeCarte,
  LieuReference,
  NiveauZone,
  PointCarte,
  PointInteret,
  QUARTIERS_OUAGADOUGOU,
  ResultatProximite,
  SelectionCarte,
  VueCarte,
  VILLES_BURKINA,
  ZoneQuartier,
  ZoneVille,
} from '../models/map.model';

// ── Identifiants des sources / couches MapLibre ──
const SRC_LOGEMENTS = 'logements-source';
const LYR_CLUSTERS = 'logements-clusters';
const LYR_CLUSTERS_HALO = 'logements-clusters-halo'; // ← nouveau halo
const LYR_CLUSTER_NB = 'logements-clusters-compteur';
const LYR_POINTS_BG = 'logements-points-bg'; // ← nouveau fond bulle
const LYR_POINTS = 'logements-points';

const SRC_POI = 'poi-source';
const LYR_POI = 'poi-couche';
const LYR_POI_LABEL = 'poi-labels';

const SRC_QUARTIERS = 'quartiers-source';
const LYR_QUARTIERS_FILL = 'quartiers-fill';
const LYR_QUARTIERS_BORDER = 'quartiers-border';
const LYR_QUARTIERS_LABEL = 'quartiers-label';

const SRC_VILLES = 'villes-source';
const LYR_VILLES_FILL = 'villes-fill';
const LYR_VILLES_BORDER = 'villes-border';
const LYR_VILLES_LABEL = 'villes-label';

const SRC_PROXIMITE = 'proximite-source';
const LYR_PROXIMITE_CERCLE = 'proximite-cercle';
const LYR_PROXIMITE_BORDER = 'proximite-border';

/** Couleurs POI par catégorie */
const COULEURS_POI: Record<string, string> = {
  hopital: '#e8552d',
  universite: '#5c5c5c',
  ecole: '#C1440E',
  marche: '#2f8f4e',
  travail: '#1D5EA8',
};

/** Couleur de remplissage d'une zone selon le prix moyen (FCFA) */
function couleurZonePrix(prixMoyen: number): string {
  if (prixMoyen < 30000) return 'rgba(29,138,82,0.18)';
  if (prixMoyen < 80000) return 'rgba(245,166,35,0.18)';
  if (prixMoyen < 200000) return 'rgba(193,68,14,0.18)';
  return 'rgba(138,47,7,0.22)';
}
function couleurBordurePrix(prixMoyen: number): string {
  if (prixMoyen < 30000) return '#1D8A52';
  if (prixMoyen < 80000) return '#F5A623';
  if (prixMoyen < 200000) return '#C1440E';
  return '#8A2F07';
}

function cercleGeoJSON(
  centre: Coordonnees,
  rayonMetres: number,
  nbPoints = 64,
): Feature<Polygon> {
  const earthRadius = 6371000;
  const lat = (centre.latitude * Math.PI) / 180;
  const lng = (centre.longitude * Math.PI) / 180;
  const dLat = rayonMetres / earthRadius;
  const dLng = rayonMetres / (earthRadius * Math.cos(lat));
  const coords: [number, number][] = [];
  for (let i = 0; i <= nbPoints; i++) {
    const angle = (2 * Math.PI * i) / nbPoints;
    coords.push([
      ((lng + dLng * Math.cos(angle)) * 180) / Math.PI,
      ((lat + dLat * Math.sin(angle)) * 180) / Math.PI,
    ]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}

function distanceMetres(a: Coordonnees, b: Coordonnees): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x =
    sinDLat * sinDLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinDLng *
      sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

@Injectable({ providedIn: 'root' })
export class MapService implements OnDestroy {
  private map?: MapLibreMap;
  private popupCourante?: Popup;

  readonly selection$ = new Subject<SelectionCarte>();
  readonly niveauZone$ = new BehaviorSubject<NiveauZone>('quartier');

  // ════════════════════════════════════════════════════════
  // INITIALISATION
  // ════════════════════════════════════════════════════════

  initialiserCarte(container: HTMLElement, vue: VueCarte, fond: FondDeCarte = 'plan'): MapLibreMap {
    const style = this.construireStyle(fond);

    this.map = new maplibregl.Map({
      container,
      style, // URL string pour 'plan', objet pour satellite/hybride
      center: [vue.centre.longitude, vue.centre.latitude],
      zoom: vue.zoom,
      attributionControl: false,
    });

    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // ← Appliquer les overrides dès que le style vectoriel est chargé
    this.map.once('styledata', () => {
      if (fond === 'plan') this.appliquerOverridesStyle();
    });

    this.map.on('zoom', () => this.mettreAJourNiveauZone());

    return this.map;
  }

  changerFondDeCarte(fond: FondDeCarte): void {
    if (!this.map) return;
    const centre = this.map.getCenter();
    const zoom = this.map.getZoom();
    const style = this.construireStyle(fond);

    this.map.setStyle(style);

    this.map.once('styledata', () => {
      this.map?.jumpTo({ center: centre, zoom });
      // Re-appliquer les overrides uniquement en mode plan
      if (fond === 'plan') this.appliquerOverridesStyle();
      // ⚠️ Les sources/couches custom (logements, POI…) sont perdues après
      // setStyle() — il faut les re-ajouter ici si nécessaire
    });
  }

  obtenirInstance(): MapLibreMap | undefined {
    return this.map;
  }

  detruireCarte(): void {
    this.popupCourante?.remove();
    this.map?.remove();
    this.map = undefined;
    this.marqueurPosition = undefined;
    this.cachePillImages.clear();
  }

  // ════════════════════════════════════════════════════════
  // MARQUEUR DE POSITION (création / édition d'un logement)
  // ════════════════════════════════════════════════════════
  // Marqueur unique, déplaçable, utilisé par le gérant pour pointer
  // l'emplacement GPS exact d'un logement (obligatoire pour `gpsVerifie`).

  private marqueurPosition?: Marker;

  /**
   * Place (ou déplace) le marqueur de position. Si `onDeplacement` est fourni,
   * il est appelé avec les nouvelles coordonnées à chaque fin de glisser-déposer
   * du marqueur — permet au composant appelant de garder son formulaire à jour.
   */
  placerMarqueurPosition(
    longitude: number,
    latitude: number,
    onDeplacement?: (longitude: number, latitude: number) => void,
  ): void {
    if (!this.map) return;

    if (this.marqueurPosition) {
      this.marqueurPosition.setLngLat([longitude, latitude]);
      return;
    }

    this.marqueurPosition = new maplibregl.Marker({ color: '#C1440E', draggable: true })
      .setLngLat([longitude, latitude])
      .addTo(this.map);

    if (onDeplacement) {
      this.marqueurPosition.on('dragend', () => {
        const pos = this.marqueurPosition!.getLngLat();
        onDeplacement(pos.lng, pos.lat);
      });
    }
  }

  retirerMarqueurPosition(): void {
    this.marqueurPosition?.remove();
    this.marqueurPosition = undefined;
  }


  ngOnDestroy(): void {
    this.detruireCarte();
  }

  // ════════════════════════════════════════════════════════
  // MARQUEURS LOGEMENTS
  // ════════════════════════════════════════════════════════

  // ── Cache des images pill déjà générées (évite de recréer à chaque update) ──
  private readonly cachePillImages = new Set<string>();

  /**
   * Génère une image pill-bulle (style Zillow/Redfin) via Canvas et l'enregistre
   * dans MapLibre sous le nom `pill-${label}-${variante}`.
   * variante : 'normal' | 'certifie' | 'selectionne'
   */
  private async creerImagePill(
    label: string,
    variante: 'normal' | 'certifie' | 'selectionne' = 'normal',
  ): Promise<void> {
    const cle = `pill-${label}-${variante}`;
    if (this.cachePillImages.has(cle) && this.map?.hasImage(cle)) return;

    const ratio = window.devicePixelRatio || 1;
    const font = `bold ${13 * ratio}px Inter, sans-serif`;
    const paddingH = 10 * ratio;
    const paddingV = 5 * ratio;
    const radius = 6 * ratio;

    // ── Mesure du texte ──
    const mesure = document.createElement('canvas').getContext('2d')!;
    mesure.font = font;
    const textW = mesure.measureText(label).width;

    const W = Math.ceil(textW + paddingH * 2);
    const H = Math.ceil(13 * ratio + paddingV * 2);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(1, 1);

    // ── Couleurs selon variante ──
    let bgColor: string;
    let textColor: string;
    let strokeColor: string;

    if (variante === 'selectionne') {
      bgColor = '#FFFFFF';
      textColor = '#1A1410';
      strokeColor = '#1A1410';
    } else if (variante === 'certifie') {
      bgColor = '#C1440E';
      textColor = '#FFFFFF';
      strokeColor = 'transparent';
    } else {
      bgColor = '#1A1410'; // gris très sombre — style image 1
      textColor = '#FFFFFF';
      strokeColor = 'transparent';
    }

    // ── Dessin de la pill ──
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(W - radius, 0);
    ctx.quadraticCurveTo(W, 0, W, radius);
    ctx.lineTo(W, H - radius);
    ctx.quadraticCurveTo(W, H, W - radius, H);
    ctx.lineTo(radius, H);
    ctx.quadraticCurveTo(0, H, 0, H - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();

    ctx.fillStyle = bgColor;
    ctx.fill();

    if (strokeColor !== 'transparent') {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5 * ratio;
      ctx.stroke();
    }

    // Ombre légère (effet Google Maps)
    if (variante === 'selectionne') {
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 4 * ratio;
      ctx.shadowOffsetY = 1 * ratio;
    }

    // ── Texte ──
    ctx.font = font;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'transparent';
    ctx.fillText(label, W / 2, H / 2);

    // ── Enregistrement dans MapLibre ──
    const imageData = ctx.getImageData(0, 0, W, H);
    if (this.map?.hasImage(cle)) this.map.removeImage(cle);
    this.map?.addImage(cle, imageData, { pixelRatio: ratio });
    this.cachePillImages.add(cle);
  }

  afficherPoints(points: PointCarte[]): void {
    if (!this.map) return;

    const geojson: FeatureCollection= {
      type: 'FeatureCollection',
      features: points.map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.coordonnees.longitude, p.coordonnees.latitude],
        },
        properties: {
          id: p.id,
          etiquette: p.etiquette,
          certifie: p.certifie ?? false,
          selectionne: p.selectionne ?? false,
          // Clé d'image pill = nom de l'image pré-générée
          imageId: p.selectionne
            ? `pill-${p.etiquette}-selectionne`
            : p.certifie
              ? `pill-${p.etiquette}-certifie`
              : `pill-${p.etiquette}-normal`,
        },
      })),
    };

    const appliquer = async () => {
      // ── Pré-générer les images pill pour chaque étiquette unique ──
      const variantes: Array<'normal' | 'certifie' | 'selectionne'> = [
        'normal',
        'certifie',
        'selectionne',
      ];
      const etiquettesUniques = [...new Set(points.map((p) => p.etiquette))];
      await Promise.all(
        etiquettesUniques.flatMap((label) => variantes.map((v) => this.creerImagePill(label, v))),
      );

      const source = this.map?.getSource(SRC_LOGEMENTS) as GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
        return;
      }

      this.map?.addSource(SRC_LOGEMENTS, {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });

      // ── Halo externe cluster (anneau translucide, style Google Maps) ──
      this.map?.addLayer({
        id: LYR_CLUSTERS_HALO,
        type: 'circle',
        source: SRC_LOGEMENTS,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'transparent',
          'circle-radius': ['step', ['get', 'point_count'], 28, 10, 35, 25, 42],
          'circle-stroke-width': 3,
          'circle-stroke-color': [
            'step',
            ['get', 'point_count'],
            'rgba(255,107,53,0.28)',
            10,
            'rgba(232,57,26,0.25)',
            25,
            'rgba(185,28,28,0.22)',
          ],
        },
      });

      // ── Cercle cluster principal ──
      this.map?.addLayer({
        id: LYR_CLUSTERS,
        type: 'circle',
        source: SRC_LOGEMENTS,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#FF6B35', 10, '#E8391A', 25, '#B91C1C'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 26, 25, 32],
          'circle-stroke-width': 4,
          'circle-stroke-color': 'rgba(255,255,255,0.9)',
          'circle-opacity': 0.97,
        },
      });

      // ── Compteur cluster ──
      this.map?.addLayer({
        id: LYR_CLUSTER_NB,
        type: 'symbol',
        source: SRC_LOGEMENTS,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count}',
          'text-font': ['Noto Sans Bold'],
          'text-size': 14,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // ── Fond pill (layer inutile — gardé pour compatibilité event) ──
      // LYR_POINTS_BG est remplacé par l'icône pill dans LYR_POINTS
      // On ajoute un layer symbol vide pour que les events sur LYR_POINTS_BG fonctionnent toujours
      this.map?.addLayer({
        id: LYR_POINTS_BG,
        type: 'symbol',
        source: SRC_LOGEMENTS,
        filter: ['!', ['has', 'point_count']],
        layout: { 'text-field': '' },
      });

      // ── Marqueur pill image ──
      this.map?.addLayer({
        id: LYR_POINTS,
        type: 'symbol',
        source: SRC_LOGEMENTS,
        filter: ['!', ['has', 'point_count']],
        layout: {
          // Utilise l'imageId stocké dans les propriétés du feature
          'icon-image': ['get', 'imageId'],
          'icon-anchor': 'center',
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
          'text-field': '', // pas de texte séparé, tout est dans l'image
        },
        paint: {
          // Légère ombre portée sous la pill
          'icon-opacity': 1,
        },
      });

      this.attacherEvenementsMarqueurs();
    };

    this.map.isStyleLoaded() ? appliquer() : this.map.once('load', appliquer);
  }

  /**
   * Met à jour l'état "sélectionné" d'un logement sur la carte.
   * Régénère l'image pill et force le rechargement de la source.
   */
  mettreAJourSelection(idSelectionne: string | null, points: PointCarte[]): void {
    const pointsMaj = points.map((p) => ({ ...p, selectionne: p.id === idSelectionne }));
    this.afficherPoints(pointsMaj);
  }

  cadrerSurPoints(points: PointCarte[]): void {
    if (!this.map || points.length === 0) return;
    if (points.length === 1) {
      this.map.flyTo({
        center: [points[0].coordonnees.longitude, points[0].coordonnees.latitude],
        zoom: 14,
      });
      return;
    }
    const lngs = points.map((p) => p.coordonnees.longitude);
    const lats = points.map((p) => p.coordonnees.latitude);
    this.map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48, maxZoom: 14 },
    );
  }

  // ════════════════════════════════════════════════════════
  // POINTS D'INTÉRÊT
  // ════════════════════════════════════════════════════════

  afficherPointsInteret(points: PointInteret[], categoriesActives: Set<string>): void {
    if (!this.map) return;

    const visibles = points.filter((p) => categoriesActives.has(p.categorie));
    const geojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: visibles.map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.coordonnees.longitude, p.coordonnees.latitude],
        },
        properties: { id: p.id, nom: p.nom, couleur: COULEURS_POI[p.categorie] ?? '#333333' },
      })),
    };

    const appliquer = () => {
      const source = this.map?.getSource(SRC_POI) as GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
        return;
      }

      this.map?.addSource(SRC_POI, { type: 'geojson', data: geojson });

      this.map?.addLayer({
        id: LYR_POI,
        type: 'circle',
        source: SRC_POI,
        paint: {
          'circle-color': ['get', 'couleur'],
          'circle-radius': 7,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
          'circle-blur': 0,
        },
      });

      this.map?.addLayer({
        id: LYR_POI_LABEL,
        type: 'symbol',
        source: SRC_POI,
        layout: {
          'text-field': ['get', 'nom'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#1A1410',
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 2,
          'text-halo-blur': 0,
        },
      });
    };

    this.map.isStyleLoaded() ? appliquer() : this.map.once('load', appliquer);
  }

  // ════════════════════════════════════════════════════════
  // NIVEAU 1 — ZONES QUARTIERS
  // ════════════════════════════════════════════════════════

  afficherZonesQuartiers(quartiers: ZoneQuartier[] = QUARTIERS_OUAGADOUGOU): void {
    if (!this.map) return;

    const geojsonZones: FeatureCollection = {
      type: 'FeatureCollection',
      features: quartiers.map((q) => ({
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [q.polygone] },
        properties: {
          id: q.id,
          nom: q.nom,
          prixMoyen: q.statistiques.prixMoyen,
          nombreLogements: q.statistiques.nombreLogements,
          tauxEau: q.statistiques.tauxEau,
          tauxCourant: q.statistiques.tauxCourant,
          tauxCertifie: q.statistiques.tauxCertifie,
          evolutionPrix: q.statistiques.evolutionPrixPct ?? 0,
          fillColor: couleurZonePrix(q.statistiques.prixMoyen),
          borderColor: couleurBordurePrix(q.statistiques.prixMoyen),
          populaire: q.populaire ?? false,
        },
      })),
    };

    const geojsonLabels: FeatureCollection = {
      type: 'FeatureCollection',
      features: quartiers.map((q) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [q.centre.longitude, q.centre.latitude] },
        properties: {
          id: q.id,
          nom: q.nom,
          nombreLogements: q.statistiques.nombreLogements,
          prixMoyen: q.statistiques.prixMoyen,
        },
      })),
    };

    const appliquer = () => {
      this.supprimerCouchesSi([LYR_VILLES_FILL, LYR_VILLES_BORDER, LYR_VILLES_LABEL], [SRC_VILLES]);

      const src = this.map?.getSource(SRC_QUARTIERS) as GeoJSONSource | undefined;
      if (src) {
        src.setData(geojsonZones);
        return;
      }

      this.map?.addSource(SRC_QUARTIERS, { type: 'geojson', data: geojsonZones });

      // ── Remplissage — plus transparent pour laisser voir la carte ──
      this.map?.addLayer(
        {
          id: LYR_QUARTIERS_FILL,
          type: 'fill',
          source: SRC_QUARTIERS,
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': 0.35, // ↓ vs 0.7 original — carte visible dessous
            'fill-antialias': true,
          },
        },
        LYR_CLUSTERS,
      );

      // ── Bordure nette, épaisseur adaptée au zoom ──
      this.map?.addLayer(
        {
          id: LYR_QUARTIERS_BORDER,
          type: 'line',
          source: SRC_QUARTIERS,
          paint: {
            'line-color': ['get', 'borderColor'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 14, 2.5],
            'line-opacity': 1,
            'line-blur': 0, // ← netteté maximale
          },
        },
        LYR_CLUSTERS,
      );

      // ── Labels nets, taille adaptée au zoom ──
      this.map?.addSource(SRC_QUARTIERS + '-labels', { type: 'geojson', data: geojsonLabels });
      this.map?.addLayer({
        id: LYR_QUARTIERS_LABEL,
        type: 'symbol',
        source: SRC_QUARTIERS + '-labels',
        layout: {
          'text-field': [
            'concat',
            ['get', 'nom'],
            '\n',
            ['to-string', ['get', 'nombreLogements']],
            ' logements',
          ],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 14, 13],
          'text-anchor': 'center',
          'text-max-width': 8,
          'text-line-height': 1.3,
          'symbol-avoid-edges': true,
        },
        paint: {
          'text-color': '#1A1410',
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 2.5,
          'text-halo-blur': 0,
        },
      });

      this.attacherEvenementsQuartiers(quartiers);
    };

    this.map.isStyleLoaded() ? appliquer() : this.map.once('load', appliquer);
  }

  masquerZonesQuartiers(): void {
    this.supprimerCouchesSi(
      [LYR_QUARTIERS_FILL, LYR_QUARTIERS_BORDER, LYR_QUARTIERS_LABEL],
      [SRC_QUARTIERS, SRC_QUARTIERS + '-labels'],
    );
  }

  // ════════════════════════════════════════════════════════
  // NIVEAU 3 — VILLES (vue nationale)
  // ════════════════════════════════════════════════════════

  afficherZonesVilles(villes: ZoneVille[] = VILLES_BURKINA): void {
    if (!this.map) return;

    const geojsonZones: FeatureCollection = {
      type: 'FeatureCollection',
      features: villes.map((v) => ({
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [v.polygone] },
        properties: {
          id: v.id,
          nom: v.nom,
          prixMoyen: v.statistiques.prixMoyen,
          nombreLogements: v.statistiques.nombreLogements,
          tauxEau: v.statistiques.tauxEau,
          tauxCourant: v.statistiques.tauxCourant,
          evolutionPrix: v.statistiques.evolutionPrixPct ?? 0,
          fillColor: couleurZonePrix(v.statistiques.prixMoyen),
          borderColor: couleurBordurePrix(v.statistiques.prixMoyen),
          quartiersTop: v.quartiersPopulaires.join(', '),
        },
      })),
    };

    const geojsonLabels: FeatureCollection = {
      type: 'FeatureCollection',
      features: villes.map((v) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [v.centre.longitude, v.centre.latitude] },
        properties: {
          id: v.id,
          nom: v.nom,
          nombreLogements: v.statistiques.nombreLogements,
          prixMoyen: v.statistiques.prixMoyen,
        },
      })),
    };

    const appliquer = () => {
      this.supprimerCouchesSi(
        [LYR_QUARTIERS_FILL, LYR_QUARTIERS_BORDER, LYR_QUARTIERS_LABEL],
        [SRC_QUARTIERS, SRC_QUARTIERS + '-labels'],
      );

      const src = this.map?.getSource(SRC_VILLES) as GeoJSONSource | undefined;
      if (src) {
        src.setData(geojsonZones);
        return;
      }

      this.map?.addSource(SRC_VILLES, { type: 'geojson', data: geojsonZones });

      // ── Remplissage ville — transparent ──
      this.map?.addLayer(
        {
          id: LYR_VILLES_FILL,
          type: 'fill',
          source: SRC_VILLES,
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': 0.35, // ↓ vs 0.55 original
            'fill-antialias': true,
          },
        },
        LYR_CLUSTERS,
      );

      // ── Bordure ville nette ──
      this.map?.addLayer(
        {
          id: LYR_VILLES_BORDER,
          type: 'line',
          source: SRC_VILLES,
          paint: {
            'line-color': ['get', 'borderColor'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 10, 2.5],
            'line-opacity': 1,
            'line-blur': 0,
          },
        },
        LYR_CLUSTERS,
      );

      // ── Labels villes nets ──
      this.map?.addSource(SRC_VILLES + '-labels', { type: 'geojson', data: geojsonLabels });
      this.map?.addLayer({
        id: LYR_VILLES_LABEL,
        type: 'symbol',
        source: SRC_VILLES + '-labels',
        layout: {
          'text-field': [
            'concat',
            ['get', 'nom'],
            '\n',
            ['to-string', ['get', 'nombreLogements']],
            ' logements',
          ],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 10, 14],
          'text-anchor': 'center',
          'text-line-height': 1.3,
          'symbol-avoid-edges': true,
        },
        paint: {
          'text-color': '#1A1410',
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 2.5,
          'text-halo-blur': 0,
        },
      });

      this.attacherEvenementsVilles(villes);
    };

    this.map.isStyleLoaded() ? appliquer() : this.map.once('load', appliquer);
  }

  masquerZonesVilles(): void {
    this.supprimerCouchesSi(
      [LYR_VILLES_FILL, LYR_VILLES_BORDER, LYR_VILLES_LABEL],
      [SRC_VILLES, SRC_VILLES + '-labels'],
    );
  }

  // ════════════════════════════════════════════════════════
  // RECHERCHE PAR PROXIMITÉ
  // ════════════════════════════════════════════════════════

  afficherZoneProximite(
    lieu: LieuReference,
    logements: readonly { id: string; latitude: number; longitude: number }[],
  ): ResultatProximite {
    if (!this.map)
      return {
        lieuId: lieu.id,
        lieuLibelle: lieu.libelle,
        nombreLogementsProches: 0,
        logementIds: [],
      };

    const rayon = lieu.rayonMetres ?? 2000;
    const cercle = cercleGeoJSON(lieu.coordonnees, rayon);
    const geojson: FeatureCollection = { type: 'FeatureCollection', features: [cercle] };

    const appliquer = () => {
      const src = this.map?.getSource(SRC_PROXIMITE) as GeoJSONSource | undefined;
      if (src) {
        src.setData(geojson);
      } else {
        this.map?.addSource(SRC_PROXIMITE, { type: 'geojson', data: geojson });

        // ── Remplissage cercle de proximité ──
        this.map?.addLayer(
          {
            id: LYR_PROXIMITE_CERCLE,
            type: 'fill',
            source: SRC_PROXIMITE,
            paint: {
              'fill-color': '#1D5EA8',
              'fill-opacity': 0.06,
              'fill-antialias': true,
            },
          },
          LYR_CLUSTERS,
        );

        // ── Bordure cercle nette en tirets ──
        this.map?.addLayer(
          {
            id: LYR_PROXIMITE_BORDER,
            type: 'line',
            source: SRC_PROXIMITE,
            paint: {
              'line-color': '#1D5EA8',
              'line-width': 2.5,
              'line-dasharray': [3, 2],
              'line-opacity': 0.9,
              'line-blur': 0,
            },
          },
          LYR_CLUSTERS,
        );
      }

      new maplibregl.Marker({ color: COULEURS_POI[lieu.categorie] ?? '#1D5EA8' })
        .setLngLat([lieu.coordonnees.longitude, lieu.coordonnees.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="font-family:Inter,sans-serif;font-size:13px;padding:4px 2px">
              <strong>${lieu.libelle}</strong><br/>
              Rayon : ${rayon >= 1000 ? (rayon / 1000).toFixed(1) + ' km' : rayon + ' m'}
             </div>`,
          ),
        )
        .addTo(this.map!);

      this.map?.flyTo({
        center: [lieu.coordonnees.longitude, lieu.coordonnees.latitude],
        zoom: 14,
      });
    };

    this.map.isStyleLoaded() ? appliquer() : this.map.once('load', appliquer);

    const proches = logements.filter(
      (l) =>
        distanceMetres(lieu.coordonnees, { latitude: l.latitude, longitude: l.longitude }) <= rayon,
    );

    return {
      lieuId: lieu.id,
      lieuLibelle: lieu.libelle,
      nombreLogementsProches: proches.length,
      logementIds: proches.map((l) => l.id),
    };
  }

  masquerZoneProximite(): void {
    this.supprimerCouchesSi([LYR_PROXIMITE_CERCLE, LYR_PROXIMITE_BORDER], [SRC_PROXIMITE]);
  }

  calculerProximite(
    lieu: Coordonnees,
    logement: Coordonnees,
  ): { distanceKm: number; tempsMinutes: number } {
    const dist = distanceMetres(lieu, logement) / 1000;
    const temps = Math.round((dist / 20) * 60);
    return { distanceKm: Math.round(dist * 10) / 10, tempsMinutes: temps };
  }

  // ════════════════════════════════════════════════════════
  // ZOOM / NIVEAU DE ZONE
  // ════════════════════════════════════════════════════════

  private mettreAJourNiveauZone(): void {
    if (!this.map) return;
    const zoom = this.map.getZoom();
    let niveau: NiveauZone;
    if (zoom >= 13) niveau = 'quartier';
    else if (zoom >= 7) niveau = 'ville';
    else niveau = 'national';
    if (this.niveauZone$.value !== niveau) this.niveauZone$.next(niveau);
  }

  zoomerSurVille(ville: ZoneVille): void {
    if (!this.map) return;
    const lngs = ville.polygone.map((c) => c[0]);
    const lats = ville.polygone.map((c) => c[1]);
    this.map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 40, duration: 800 },
    );
  }

  zoomerSurQuartier(quartier: ZoneQuartier): void {
    if (!this.map) return;
    const lngs = quartier.polygone.map((c) => c[0]);
    const lats = quartier.polygone.map((c) => c[1]);
    this.map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 32, duration: 600 },
    );
  }

  // ════════════════════════════════════════════════════════
  // POPUPS ZONES
  // ════════════════════════════════════════════════════════

  private afficherPopupQuartier(q: ZoneQuartier, lngLat: [number, number]): void {
    if (!this.map) return;
    this.popupCourante?.remove();
    const evo = q.statistiques.evolutionPrixPct ?? 0;
    const evoHtml =
      evo > 0
        ? `<span style="color:#C1440E">▲ +${evo}%</span>`
        : evo < 0
          ? `<span style="color:#1D8A52">▼ ${evo}%</span>`
          : '<span style="color:#9C9690">= stable</span>';

    this.popupCourante = new maplibregl.Popup({ maxWidth: '260px', closeButton: true })
      .setLngLat(lngLat)
      .setHTML(
        `
        <div style="font-family:Inter,sans-serif;font-size:13px;padding:4px 0;line-height:1.6">
          <div style="font-size:15px;font-weight:600;margin-bottom:6px">${q.nom}</div>
          <div>🏠 <strong>${q.statistiques.nombreLogements}</strong> logements disponibles</div>
          <div>💰 Prix moyen : <strong>${q.statistiques.prixMoyen.toLocaleString('fr-FR')} FCFA</strong></div>
          <div>📈 Évolution 3 mois : ${evoHtml}</div>
          <div>💧 Eau disponible : <strong>${q.statistiques.tauxEau}%</strong></div>
          <div>⚡ Courant : <strong>${q.statistiques.tauxCourant}%</strong></div>
          <div>✅ Certifiés KaSa : <strong>${q.statistiques.tauxCertifie}%</strong></div>
          <button
            onclick="window.dispatchEvent(new CustomEvent('kasa:filtrer-quartier',{detail:'${q.id}'}))"
            style="margin-top:8px;width:100%;padding:6px;background:#C1440E;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600"
          >Rechercher dans ${q.nom}</button>
        </div>
      `,
      )
      .addTo(this.map);
  }

  private afficherPopupVille(v: ZoneVille, lngLat: [number, number]): void {
    if (!this.map) return;
    this.popupCourante?.remove();
    const evo = v.statistiques.evolutionPrixPct ?? 0;
    const evoHtml =
      evo > 0
        ? `<span style="color:#C1440E">▲ +${evo}%</span>`
        : evo < 0
          ? `<span style="color:#1D8A52">▼ ${evo}%</span>`
          : '= stable';

    this.popupCourante = new maplibregl.Popup({ maxWidth: '280px', closeButton: true })
      .setLngLat(lngLat)
      .setHTML(
        `
        <div style="font-family:Inter,sans-serif;font-size:13px;padding:4px 0;line-height:1.7">
          <div style="font-size:16px;font-weight:700;margin-bottom:6px">${v.nom}</div>
          <div>🏠 <strong>${v.statistiques.nombreLogements}</strong> logements disponibles</div>
          <div>💰 Prix moyen : <strong>${v.statistiques.prixMoyen.toLocaleString('fr-FR')} FCFA</strong></div>
          <div>📊 Évolution : ${evoHtml}</div>
          <div>💧 Eau : <strong>${v.statistiques.tauxEau}%</strong> · ⚡ Courant : <strong>${v.statistiques.tauxCourant}%</strong></div>
          <div style="margin-top:4px;font-size:11px;color:#6B6560">🔥 Quartiers populaires : ${v.quartiersPopulaires.join(', ')}</div>
          <button
            onclick="window.dispatchEvent(new CustomEvent('kasa:zoom-ville',{detail:'${v.id}'}))"
            style="margin-top:8px;width:100%;padding:6px;background:#C1440E;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600"
          >Explorer ${v.nom}</button>
        </div>
      `,
      )
      .addTo(this.map);
  }

  // ════════════════════════════════════════════════════════
  // ÉVÉNEMENTS
  // ════════════════════════════════════════════════════════

  private attacherEvenementsMarqueurs(): void {
    if (!this.map) return;

    this.map.on('click', LYR_POINTS, (e) => {
      const id = e.features?.[0]?.properties?.['id'];
      if (id) this.selection$.next({ type: 'point', id });
    });

    this.map.on('click', LYR_CLUSTERS, (e) => {
      const feature = e.features?.[0];
      const clusterId = feature?.properties?.['cluster_id'];
      const source = this.map?.getSource(SRC_LOGEMENTS) as GeoJSONSource | undefined;
      if (clusterId === undefined || !source) return;
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geo = feature!.geometry as { type: string; coordinates: [number, number] };
        this.map?.easeTo({ center: geo.coordinates, zoom });
      });
    });

    [LYR_POINTS, LYR_CLUSTERS].forEach((c) => {
      this.map?.on('mouseenter', c, () => (this.map!.getCanvas().style.cursor = 'pointer'));
      this.map?.on('mouseleave', c, () => (this.map!.getCanvas().style.cursor = ''));
    });
  }

  private attacherEvenementsQuartiers(quartiers: ZoneQuartier[]): void {
    if (!this.map) return;

    this.map.on('click', LYR_QUARTIERS_FILL, (e) => {
      const id = e.features?.[0]?.properties?.['id'];
      const q = quartiers.find((q) => q.id === id);
      if (q) {
        this.afficherPopupQuartier(q, [e.lngLat.lng, e.lngLat.lat]);
        this.selection$.next({ type: 'quartier', id: q.id });
      }
    });

    this.map.on(
      'mouseenter',
      LYR_QUARTIERS_FILL,
      () => (this.map!.getCanvas().style.cursor = 'pointer'),
    );
    this.map.on('mouseleave', LYR_QUARTIERS_FILL, () => (this.map!.getCanvas().style.cursor = ''));
  }

  private attacherEvenementsVilles(villes: ZoneVille[]): void {
    if (!this.map) return;

    this.map.on('click', LYR_VILLES_FILL, (e) => {
      const id = e.features?.[0]?.properties?.['id'];
      const v = villes.find((v) => v.id === id);
      if (v) {
        this.afficherPopupVille(v, [e.lngLat.lng, e.lngLat.lat]);
        this.selection$.next({ type: 'ville', id: v.id });
      }
    });

    this.map.on(
      'mouseenter',
      LYR_VILLES_FILL,
      () => (this.map!.getCanvas().style.cursor = 'pointer'),
    );
    this.map.on('mouseleave', LYR_VILLES_FILL, () => (this.map!.getCanvas().style.cursor = ''));
  }

  // ════════════════════════════════════════════════════════
  // UTILITAIRES
  // ════════════════════════════════════════════════════════

  private supprimerCouchesSi(couches: string[], sources: string[]): void {
    couches.forEach((c) => {
      if (this.map?.getLayer(c)) this.map.removeLayer(c);
    });
    sources.forEach((s) => {
      if (this.map?.getSource(s)) this.map.removeSource(s);
    });
  }

  // ════════════════════════════════════════════════════════
  // STYLE DES TUILES — netteté proche Google Maps
  // ════════════════════════════════════════════════════════

  private construireStyle(fond: FondDeCarte): StyleSpecification | string {
    // ── Tuile satellite raster (Esri — inchangé) ────────────────────────────
    const TUILE_SATELLITE =
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const TUILE_LIBELLES =
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

    // ── MODE SATELLITE ───────────────────────────────────────────────────────
    if (fond === 'satellite') {
      return {
        version: 8 as const,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          esriImagery: {
            type: 'raster',
            tiles: [TUILE_SATELLITE],
            tileSize: 256,
            maxzoom: 20,
            attribution: 'Esri, Maxar, Earthstar Geographics',
          },
        },
        layers: [
          {
            id: 'base',
            type: 'raster',
            source: 'esriImagery',
            paint: { 'raster-opacity': 1, 'raster-resampling': 'linear' },
          },
        ],
      };
    }

    // ── MODE HYBRIDE ─────────────────────────────────────────────────────────
    if (fond === 'hybride') {
      return {
        version: 8 as const,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          esriImagery: {
            type: 'raster',
            tiles: [TUILE_SATELLITE],
            tileSize: 256,
            maxzoom: 20,
            attribution: 'Esri, Maxar, Earthstar Geographics',
          },
          esriLibelles: {
            type: 'raster',
            tiles: [TUILE_LIBELLES],
            tileSize: 256,
            maxzoom: 20,
          },
        },
        layers: [
          {
            id: 'base',
            type: 'raster',
            source: 'esriImagery',
            paint: { 'raster-opacity': 1, 'raster-resampling': 'linear' },
          },
          {
            id: 'libelles',
            type: 'raster',
            source: 'esriLibelles',
            paint: { 'raster-opacity': 0.9, 'raster-resampling': 'linear' },
          },
        ],
      };
    }
    return 'https://tiles.openfreemap.org/styles/liberty';
  }

  /**
   * Applique les overrides de style sur le fond vectoriel plan :
   * - Langue française sur tous les labels
   * - Suppression de l'écriture arabe / multilingue
   * - Palette de couleurs propre style Zillow (fond blanc cassé, routes nettes)
   * - Typographie nette (pas de halo flou)
   *
   * À appeler dans map.once('styledata', ...) après chaque changerFondDeCarte('plan').
   */
  private appliquerOverridesStyle(): void {
    if (!this.map) return;

    const style = this.map.getStyle();
    if (!style?.layers) return;

    style.layers.forEach((layer) => {
      // ── 1. LANGUE : forcer le français sur tous les labels ────────────────
      // Les styles OSM vectoriels ont souvent `['coalesce', ['get','name:fr'], ['get','name']]`
      // On force explicitement name:fr avec fallback name (latin uniquement)
      if (layer.type === 'symbol' && layer.layout?.['text-field']) {
        try {
          this.map?.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name:fr'], // français en priorité
            ['get', 'name:en'], // anglais si pas de FR
            ['get', 'name:latin'], // latin générique
            ['get', 'name'], // fallback (peut être arabe/autre script)
          ]);
        } catch (_) {}
      }

      // ── 2. COULEURS FOND — palette épurée style Zillow ────────────────────
      // Fond terre/eau
      if (['water', 'water_shadow', 'waterway'].includes(layer.id)) {
        try {
          this.map?.setPaintProperty(layer.id, 'fill-color', '#BFD7EA');
        } catch (_) {}
        try {
          this.map?.setPaintProperty(layer.id, 'line-color', '#A8C8E0');
        } catch (_) {}
      }

      // Fond général (landcover, background)
      if (['background', 'landcover', 'land'].includes(layer.id)) {
        try {
          this.map?.setPaintProperty(layer.id, 'fill-color', '#F8F5F0');
        } catch (_) {}
        try {
          this.map?.setPaintProperty(layer.id, 'background-color', '#F8F5F0');
        } catch (_) {}
      }

      // Bâtiments — gris très clair
      if (layer.id?.includes('building')) {
        try {
          this.map?.setPaintProperty(layer.id, 'fill-color', '#EDE9E3');
        } catch (_) {}
        try {
          this.map?.setPaintProperty(layer.id, 'fill-extrusion-color', '#E0DBD4');
        } catch (_) {}
      }

      // Zones vertes (parcs, forêts)
      if (
        layer.id?.includes('park') ||
        layer.id?.includes('forest') ||
        layer.id?.includes('green')
      ) {
        try {
          this.map?.setPaintProperty(layer.id, 'fill-color', '#D4E8C2');
        } catch (_) {}
      }

      // ── 3. ROUTES — couleurs nettes, hiérarchie claire ────────────────────
      if (layer.type === 'line' && layer.source === 'openmaptiles') {
        const id = layer.id ?? '';
        // Autoroutes — jaune Zillow
        if (id.includes('motorway') || id.includes('highway')) {
          try {
            this.map?.setPaintProperty(layer.id, 'line-color', '#b8b8b8');
            this.map?.setPaintProperty(layer.id, 'line-opacity', 0);
          } catch (_) {}
        }
        // Routes principales — orange/saumon
        else if (id.includes('trunk') || id.includes('primary')) {
          try {
            this.map?.setPaintProperty(layer.id, 'line-color', '#c7c7c6');
            this.map?.setPaintProperty(layer.id, 'line-opacity', 0);
          } catch (_) {}
        }
        // Routes secondaires — blanc/gris clair
        else if (id.includes('secondary') || id.includes('tertiary')) {
          try {
            this.map?.setPaintProperty(layer.id, 'line-color', '#FFFFFF');
            this.map?.setPaintProperty(layer.id, 'line-opacity', 1);
          } catch (_) {}
        }
        // Rues résidentielles — gris très clair
        else if (id.includes('residential') || id.includes('service') || id.includes('street')) {
          try {
            this.map?.setPaintProperty(layer.id, 'line-color', '#F0ECE6');
            this.map?.setPaintProperty(layer.id, 'line-opacity', 0.9);
          } catch (_) {}
        }
      }

      // ── 4. LABELS PAYS / VILLES — typographie nette ───────────────────────
      if (layer.type === 'symbol') {
        // Halo blanc net (pas de blur)
        try {
          this.map?.setPaintProperty(layer.id, 'text-halo-color', 'rgba(255,255,255,0.98)');
          this.map?.setPaintProperty(layer.id, 'text-halo-width', 1.5);
          this.map?.setPaintProperty(layer.id, 'text-halo-blur', 0);
        } catch (_) {}

        // Couleur texte selon type de lieu
        const id = layer.id ?? '';
        if (id.includes('country') || id.includes('state')) {
          try {
            this.map?.setPaintProperty(layer.id, 'text-color', '#4A4035');
          } catch (_) {}
        } else if (id.includes('capital') || id.includes('city')) {
          try {
            this.map?.setPaintProperty(layer.id, 'text-color', '#1A1410');
          } catch (_) {}
        } else {
          try {
            this.map?.setPaintProperty(layer.id, 'text-color', '#3D3530');
          } catch (_) {}
        }
      }

      // ── 5. FRONTIÈRES — tirets jaunes nets ───────────────────────────────
      // Sur les tuiles vectorielles, les dasharray fonctionnent vraiment
      if (layer.id?.includes('boundary') || layer.id?.includes('border')) {
        try {
          this.map?.setPaintProperty(layer.id, 'line-color', '#d3d2d0');
          this.map?.setPaintProperty(layer.id, 'line-opacity', 1);
          this.map?.setPaintProperty(layer.id, 'line-dasharray', [4, 3]);
        } catch (_) {}
      }
    });
  }
}
