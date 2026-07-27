import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import maplibregl from 'maplibre-gl';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './test.html',
  styleUrls: ['./test.css']
})
export class Test implements AfterViewInit {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [-1.5197, 12.3714],
      zoom: 6,
      minZoom: 4,
      maxZoom: 18,
      maxBounds: [[-10.0, 6.0], [6.0, 18.0]]
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {

      // ── DEBUG : décommenter pour voir les vrais noms des couches ──────
      // console.log(map.getStyle().layers.map(l => l.id));

      fetch('/assets/burkina_faso.geojson')
        .then(r => r.json())
        .then(burkina => {

          const burkinaGeom = burkina.features[0].geometry;
          const burkinaPolygon = {
            type: 'Feature' as const,
            properties: {},
            geometry: burkinaGeom
          };

          // ── ÉTAPE 1 : vrais noms des couches Positron de CartoDB ─────────
          // Ces noms sont exacts pour positron-gl-style
          const layersToFilter = [
            'place-city-label',
            'place-town-label',
            'place-village-label',
            'place-other-label',
            'place-suburb-label',
            'place-neighbourhood-label',
            'poi-label',
            'road-label-large',
            'road-label-medium',
            'road-label-small',
            'country-label',
            'state-label',
          ];

          const outsideBurkina = ['!', ['within', burkinaPolygon as any]];

          layersToFilter.forEach(layerId => {
            if (!map.getLayer(layerId)) return;
            const existing = map.getFilter(layerId);
            const combined = existing
              ? ['all', existing, outsideBurkina]
              : outsideBurkina;
            try {
              map.setFilter(layerId, combined as any);
            } catch (e) {
              console.warn(`Filtre ignoré pour ${layerId}:`, e);
            }
          });

          // ── ÉTAPE 2 : contour du pays ────────────────────────────────────
          map.addSource('burkina', {
            type: 'geojson',
            data: burkina
          });

          // Fond territoire — légèrement teinté pour le distinguer
          map.addLayer({
            id: 'burkina-fill',
            type: 'fill',
            source: 'burkina',
            paint: {
              'fill-color': '#EEF2FF',
              'fill-opacity': 0.6
            }
          });

          // Contour pays — ligne nette et visible
          map.addLayer({
            id: 'burkina-contour',
            type: 'line',
            source: 'burkina',
            paint: {
              'line-color': '#4338ca',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                3, 1.5, 6, 2.5, 10, 2
              ]
            }
          });

          // ── ÉTAPE 3 : provinces ──────────────────────────────────────────
          map.addSource('provinces', {
            type: 'geojson',
            data: '/assets/burkina_provinces.geojson'
          });

          map.addLayer({
            id: 'provinces-fill',
            type: 'fill',
            source: 'provinces',
            minzoom: 6,
            paint: {
              'fill-color': [
                'interpolate', ['linear'], ['zoom'],
                6, '#E8EAF6',
                10, '#C5CAE9'
              ],
              'fill-opacity': 0.3
            }
          });

          map.addLayer({
            id: 'provinces-line',
            type: 'line',
            source: 'provinces',
            minzoom: 6,
            paint: {
              'line-color': '#9fa8da',
              'line-width': 0.8,
              'line-dasharray': [4, 3]
            }
          });

          map.addLayer({
            id: 'provinces-label',
            type: 'symbol',
            source: 'provinces',
            minzoom: 7,
            maxzoom: 10,
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Italic'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 7, 9, 10, 11],
              'text-letter-spacing': 0.05,
              'text-transform': 'uppercase',
              'text-allow-overlap': false,
              'text-optional': true
            },
            paint: {
              'text-color': '#7986cb',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5
            }
          });

          // ── ÉTAPE 4 : villes ─────────────────────────────────────────────
          map.addSource('villes', {
            type: 'geojson',
            data: '/assets/burkina_villes.geojson'
          });

          // Point city
          map.addLayer({
            id: 'city-dot',
            type: 'circle',
            source: 'villes',
            minzoom: 5,
            filter: ['==', ['get', 'type'], 'city'],
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 5, 8, 8, 12, 11],
              'circle-color': '#ffffff',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#4338ca'
            }
          });

          // Point town
          map.addLayer({
            id: 'town-dot',
            type: 'circle',
            source: 'villes',
            minzoom: 7,
            filter: ['==', ['get', 'type'], 'town'],
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3, 10, 5],
              'circle-color': '#ffffff',
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#6366f1'
            }
          });

          // Point village
          map.addLayer({
            id: 'village-dot',
            type: 'circle',
            source: 'villes',
            minzoom: 9,
            filter: ['==', ['get', 'type'], 'village'],
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2, 12, 3.5],
              'circle-color': '#ffffff',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#a5b4fc'
            }
          });

          // Label city — gras, grand, noir
          map.addLayer({
            id: 'city-label',
            type: 'symbol',
            source: 'villes',
            minzoom: 5,
            filter: ['==', ['get', 'type'], 'city'],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Bold'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 8, 15, 12, 18],
              'text-offset': [0, 1],
              'text-anchor': 'top',
              'text-allow-overlap': false
            },
            paint: {
              'text-color': '#1e1b4b',
              'text-halo-color': '#ffffff',
              'text-halo-width': 2
            }
          });

          // Label town
          map.addLayer({
            id: 'town-label',
            type: 'symbol',
            source: 'villes',
            minzoom: 8,
            filter: ['==', ['get', 'type'], 'town'],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 12, 13],
              'text-offset': [0, 0.8],
              'text-anchor': 'top',
              'text-allow-overlap': false
            },
            paint: {
              'text-color': '#312e81',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5
            }
          });

          // Label village
          map.addLayer({
            id: 'village-label',
            type: 'symbol',
            source: 'villes',
            minzoom: 10,
            filter: ['==', ['get', 'type'], 'village'],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9, 13, 11],
              'text-offset': [0, 0.6],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'text-optional': true
            },
            paint: {
              'text-color': '#4338ca',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.2
            }
          });

          // ── ÉTAPE 5 : quartiers ──────────────────────────────────────────
          map.addSource('quartiers', {
            type: 'geojson',
            data: '/assets/burkina_quartiers.geojson'
          });

          map.addLayer({
            id: 'quartiers-dot',
            type: 'circle',
            source: 'quartiers',
            minzoom: 11,
            paint: {
              'circle-radius': 3,
              'circle-color': '#c7d2fe',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#6366f1',
              'circle-opacity': 0.8
            }
          });

          map.addLayer({
            id: 'quartiers-label',
            type: 'symbol',
            source: 'quartiers',
            minzoom: 12,
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 15, 12],
              'text-offset': [0, 0.8],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'text-optional': true
            },
            paint: {
              'text-color': '#4338ca',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.2
            }
          });

          // ── ÉTAPE 6 : POI ────────────────────────────────────────────────
          map.addSource('poi', {
            type: 'geojson',
            data: '/assets/burkina_poi.geojson'
          });

          const poiColor: maplibregl.ExpressionSpecification = [
            'match', ['get', 'categorie'],
            'Mosquée',         '#7c3aed',
            'Église',          '#059669',
            'Lieu de culte',   '#34d399',
            'École',           '#2563eb',
            'Lycée/Collège',   '#3b82f6',
            'Université',      '#1d4ed8',
            'Hôpital',         '#dc2626',
            'Clinique',        '#ef4444',
            'Pharmacie',       '#ea580c',
            'Marché',          '#d97706',
            'Station essence', '#ca8a04',
            'Banque',          '#0891b2',
            'Restaurant',      '#e11d48',
            'Hôtel',           '#7c3aed',
            'Aéroport',        '#4338ca',
            'Mairie',          '#475569',
            'Police',          '#0369a1',
            'Supermarché',     '#c2410c',
            '#64748b'
          ];

          // Fond blanc derrière chaque POI pour lisibilité
          map.addLayer({
            id: 'poi-bg',
            type: 'circle',
            source: 'poi',
            minzoom: 9,
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 6, 12, 9, 15, 12],
              'circle-color': '#ffffff',
              'circle-opacity': 0.9
            }
          });

          map.addLayer({
            id: 'poi-circle',
            type: 'circle',
            source: 'poi',
            minzoom: 9,
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4, 12, 7, 15, 10],
              'circle-color': poiColor,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 1
            }
          });

          map.addLayer({
            id: 'poi-label',
            type: 'symbol',
            source: 'poi',
            minzoom: 13,
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 11,
              'text-offset': [0, 1.2],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'text-optional': true,
              'text-max-width': 8
            },
            paint: {
              'text-color': '#1e293b',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5
            }
          });

          // ── ÉTAPE 7 : popups au clic ─────────────────────────────────────
          const clickableLayers = [
            'city-dot', 'town-dot', 'village-dot',
            'quartiers-dot', 'poi-circle'
          ];

          clickableLayers.forEach(layerId => {
            map.on('click', layerId, (e) => {
              const props  = e.features![0].properties;
              const coords = (e.features![0].geometry as any).coordinates;

              const population = props['population']
                ? `<div style="display:flex;align-items:center;gap:6px">
                     <span style="color:#6366f1">👥</span>
                     ${Number(props['population']).toLocaleString()} hab.
                   </div>` : '';
              const ville = props['ville']
                ? `<div style="display:flex;align-items:center;gap:6px">
                     <span>📍</span> ${props['ville']}
                   </div>` : '';
              const telephone = props['telephone']
                ? `<div style="display:flex;align-items:center;gap:6px">
                     <span>📞</span> ${props['telephone']}
                   </div>` : '';
              const categorie = props['categorie'] || props['type'] || '';

              new maplibregl.Popup({ maxWidth: '260px', className: 'bf-popup' })
                .setLngLat(coords)
                .setHTML(`
                  <div style="font-family:system-ui,sans-serif;padding:6px 2px">
                    <div style="font-size:15px;font-weight:700;color:#1e1b4b;margin-bottom:4px">
                      ${props['name'] || 'Sans nom'}
                    </div>
                    ${categorie ? `
                      <div style="display:inline-block;background:#EEF2FF;color:#4338ca;
                                  font-size:11px;padding:2px 8px;border-radius:20px;
                                  margin-bottom:8px;font-weight:500">
                        ${categorie}
                      </div>` : ''}
                    <div style="font-size:12px;color:#475569;line-height:1.9">
                      ${population}${ville}${telephone}
                    </div>
                  </div>
                `)
                .addTo(map);
            });

            map.on('mouseenter', layerId, () => {
              map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerId, () => {
              map.getCanvas().style.cursor = '';
            });
          });

        }); // fin fetch

    }); // fin map.on('load')
  }
}