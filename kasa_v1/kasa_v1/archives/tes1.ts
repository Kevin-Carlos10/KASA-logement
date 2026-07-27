import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import maplibregl from 'maplibre-gl';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './t.html',
  styleUrls: ['./t.css']
})
export class Test1 implements AfterViewInit {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-1.5197, 12.3714],
      zoom: 6,
      maxZoom: 18,
      minZoom: 3
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {

      fetch('/assets/burkina_faso.geojson')
        .then(r => r.json())
        .then(burkina => {

          const burkinaGeom = burkina.features[0].geometry;
          const burkinaPolygon = {
            type: 'Feature' as const,
            properties: {},
            geometry: burkinaGeom
          };

          // ── ÉTAPE 1 : masquer les labels OSM sur le Burkina uniquement ──
          // Les autres pays (Mali, Niger, Ghana…) conservent tous leurs
          // labels et données OSM intacts.
          // On récupère le filtre existant de chaque couche pour ne pas
          // casser sa logique interne, et on y ajoute la contrainte géo.

          const layersToFilter = [
            'place_capital',
            'place_city',
            'place_town',
            'place_village',
            'place_hamlet',
            'place_suburb',
            'place_neighbourhood',
            'place_quarter',
            'poi',
            'poi_z14',
            'poi_z15',
            'poi_z16',
            'road_label',
            'highway_name_motorway',
            'highway_name_other',
          ];

          const outsideBurkina = ['!', ['within', burkinaPolygon as any]];

          layersToFilter.forEach(layerId => {
            if (!map.getLayer(layerId)) return;

            const existing = map.getFilter(layerId);

            // Combiner le filtre existant avec le filtre géographique
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

          // Léger fond pour délimiter visuellement le territoire
          map.addLayer({
            id: 'burkina-fill',
            type: 'fill',
            source: 'burkina',
            paint: {
              'fill-color': '#f5f0e8',
              'fill-opacity': 0.25
            }
          });

          map.addLayer({
            id: 'burkina-contour',
            type: 'line',
            source: 'burkina',
            paint: {
              'line-color': '#333333',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                3, 1.5, 7, 2.5, 12, 2
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
            maxzoom: 10,
            paint: {
              'fill-color': '#e8e0d5',
              'fill-opacity': 0.5
            }
          });

          map.addLayer({
            id: 'provinces-line',
            type: 'line',
            source: 'provinces',
            minzoom: 6,
            maxzoom: 12,
            paint: {
              'line-color': '#aaaaaa',
              'line-width': 0.8,
              'line-dasharray': [3, 2]
            }
          });

          map.addLayer({
            id: 'provinces-label',
            type: 'symbol',
            source: 'provinces',
            minzoom: 7,
            maxzoom: 11,
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 7, 9, 10, 11],
              'text-allow-overlap': false,
              'text-optional': true
            },
            paint: {
              'text-color': '#666666',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1
            }
          });

          // ── ÉTAPE 4 : villes ─────────────────────────────────────────────

          map.addSource('villes', {
            type: 'geojson',
            data: '/assets/burkina_villes.geojson'
          });

          map.addLayer({
            id: 'city-dot',
            type: 'circle',
            source: 'villes',
            minzoom: 5,
            filter: ['==', ['get', 'type'], 'city'],
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 8, 7, 12, 10],
              'circle-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#333333'
            }
          });

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
              'circle-stroke-color': '#555555'
            }
          });

          map.addLayer({
            id: 'village-dot',
            type: 'circle',
            source: 'villes',
            minzoom: 9,
            filter: ['==', ['get', 'type'], 'village'],
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2, 12, 4],
              'circle-color': '#ffffff',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#777777'
            }
          });

          map.addLayer({
            id: 'city-label',
            type: 'symbol',
            source: 'villes',
            minzoom: 5,
            filter: ['==', ['get', 'type'], 'city'],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Bold'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 8, 15, 12, 17],
              'text-offset': [0, 0.9],
              'text-anchor': 'top',
              'text-allow-overlap': false
            },
            paint: {
              'text-color': '#111111',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5
            }
          });

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
              'text-offset': [0, 0.7],
              'text-anchor': 'top',
              'text-allow-overlap': false
            },
            paint: {
              'text-color': '#222222',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.2
            }
          });

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
              'text-color': '#444444',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1
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
              'circle-radius': 2,
              'circle-color': '#999999',
              'circle-opacity': 0.7
            }
          });

          map.addLayer({
            id: 'quartiers-label',
            type: 'symbol',
            source: 'quartiers',
            minzoom: 11,
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 12],
              'text-allow-overlap': false,
              'text-optional': true
            },
            paint: {
              'text-color': '#444444',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1
            }
          });

          // ── ÉTAPE 6 : POI ────────────────────────────────────────────────

          map.addSource('poi', {
            type: 'geojson',
            data: '/assets/burkina_poi.geojson'
          });

          const poiColor: maplibregl.ExpressionSpecification = [
            'match', ['get', 'categorie'],
            'Mosquée',         '#a855f7',
            'Église',          '#16a34a',
            'Lieu de culte',   '#86efac',
            'École',           '#3b82f6',
            'Lycée/Collège',   '#60a5fa',
            'Université',      '#1d4ed8',
            'Hôpital',         '#ef4444',
            'Clinique',        '#f87171',
            'Pharmacie',       '#f97316',
            'Marché',          '#ca8a04',
            'Station essence', '#eab308',
            'Banque',          '#0891b2',
            'Restaurant',      '#f43f5e',
            'Hôtel',           '#7c3aed',
            'Aéroport',        '#4f46e5',
            'Mairie',          '#475569',
            'Police',          '#0284c7',
            'Supermarché',     '#ea580c',
            '#94a3b8'
          ];

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
              'circle-opacity': 0.9
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
              'text-size': 10,
              'text-offset': [0, 1.2],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'text-optional': true
            },
            paint: {
              'text-color': '#111111',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1
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
                ? `<div>👥 ${Number(props['population']).toLocaleString()} hab.</div>` : '';
              const ville = props['ville']
                ? `<div>📍 ${props['ville']}</div>` : '';
              const telephone = props['telephone']
                ? `<div>📞 ${props['telephone']}</div>` : '';
              const categorie = props['categorie'] || props['type'] || '';

              new maplibregl.Popup({ maxWidth: '240px' })
                .setLngLat(coords)
                .setHTML(`
                  <div style="font-family:sans-serif;padding:4px">
                    <div style="font-size:14px;font-weight:bold;margin-bottom:4px">
                      ${props['name'] || 'Sans nom'}
                    </div>
                    ${categorie
                      ? `<div style="color:#888;font-size:11px;margin-bottom:6px">
                           ${categorie}
                         </div>`
                      : ''}
                    <div style="font-size:12px;line-height:1.8">
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