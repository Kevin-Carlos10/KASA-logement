/**
 * Modèles liés à l'affichage de la carte MapLibre.
 * Version KaSa — zones géographiques, statistiques par quartier/ville,
 * proximité, points d'intérêt étendus.
 */

export interface Coordonnees {
  latitude: number;
  longitude: number;
}

/** Vue initiale ou courante de la carte */
export interface VueCarte {
  centre: Coordonnees;
  zoom: number;
}

export type FondDeCarte = 'plan' | 'satellite' | 'hybride';

/** ── NIVEAU DE ZOOM GÉOGRAPHIQUE ── */
export type NiveauZone = 'quartier' | 'ville' | 'national';

// ════════════════════════════════════════════════════════════
// ZONES GÉOGRAPHIQUES : QUARTIERS + VILLES
// ════════════════════════════════════════════════════════════

/** Statistiques KaSa affichées dans la popup d'un quartier ou d'une ville */
export interface StatistiquesZone {
  nombreLogements: number;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
  devise: string;
  /** % de logements avec eau disponible */
  tauxEau: number;
  /** % de logements avec courant disponible */
  tauxCourant: number;
  /** % d'annonces certifiées BBV */
  tauxCertifie: number;
  /** Tendance des prix (+/- %) sur 3 mois */
  evolutionPrixPct?: number;
}

/**
 * NIVEAU 1 — Quartier
 * Contient le polygone GeoJSON de ses limites et les stats KaSa.
 */
export interface ZoneQuartier {
  id: string;
  nom: string;
  villeId: string;
  /** Coordonnées du centre pour label + popup */
  centre: Coordonnees;
  /** Polygone de délimitation en GeoJSON (tableau de [lng, lat]) */
  polygone: [number, number][];
  statistiques: StatistiquesZone;
  /** Quartiers les plus recherchés (booléen pour la mise en avant) */
  populaire?: boolean;
}

/**
 * NIVEAU 3 — Ville (vue nationale)
 * Contient son polygone + les stats + les quartiers les plus populaires.
 */
export interface ZoneVille {
  id: string;
  nom: string;
  centre: Coordonnees;
  polygone: [number, number][];
  statistiques: StatistiquesZone;
  /** Top 3 quartiers les plus recherchés */
  quartiersPopulaires: string[];
}

// ════════════════════════════════════════════════════════════
// RECHERCHE PAR PROXIMITÉ
// ════════════════════════════════════════════════════════════

export type CategorieProximite =
  'travail' | 'universite' | 'ecole' | 'hopital' | 'marche' | 'autre';

/** Lieu de référence renseigné par l'utilisateur pour la recherche par proximité */
export interface LieuReference {
  id: string;
  libelle: string;
  categorie: CategorieProximite;
  coordonnees: Coordonnees;
  /** Rayon de recherche en mètres (défaut : 2000 m) */
  rayonMetres?: number;
}

/** Résultat de la recherche par proximité autour d'un lieu */
export interface ResultatProximite {
  lieuId: string;
  lieuLibelle: string;
  nombreLogementsProches: number;
  logementIds: string[];
}

// ════════════════════════════════════════════════════════════
// POINTS D'INTÉRÊT (panneau « Afficher »)
// ════════════════════════════════════════════════════════════

export type CategoriePointInteret = 'hopital' | 'universite' | 'ecole' | 'marche' | 'travail';

/** Point d'intérêt affichable sur la carte */
export interface PointInteret {
  id: string;
  nom: string;
  categorie: CategoriePointInteret;
  coordonnees: Coordonnees;
}

/** Configuration d'une couche du panneau « Afficher » */
export interface CoucheAffichage {
  categorie: CategoriePointInteret;
  label: string;
  couleur: string;
  actif: boolean;
}

// ════════════════════════════════════════════════════════════
// MARQUEURS LOGEMENTS
// ════════════════════════════════════════════════════════════

/** Un point unitaire affiché sur la carte (logement avec son prix) */
export interface PointCarte {
  id: string;
  coordonnees: Coordonnees;
  /** Texte affiché dans le marqueur, ex: « 30 000 FCFA » */
  etiquette: string;
  /** Mettre le marqueur en évidence (logement sélectionné dans la liste) */
  selectionne?: boolean;
  /** true si l'annonce a passé la certification KaSa */
  certifie?: boolean;
}

// ════════════════════════════════════════════════════════════
// ÉVÉNEMENTS DE SÉLECTION
// ════════════════════════════════════════════════════════════

/** Émis quand l'utilisateur clique sur un marqueur ou un cluster */
export interface SelectionCarte {
  type: 'point' | 'cluster' | 'quartier' | 'ville';
  id: string;
  /** Présent uniquement si type === 'cluster' */
  pointIds?: string[];
}

// ════════════════════════════════════════════════════════════
// DONNÉES GÉOGRAPHIQUES — OUAGADOUGOU (seed)
// ════════════════════════════════════════════════════════════

/** Quartiers de Ouagadougou avec polygones approximatifs et stats seed */
export const QUARTIERS_OUAGADOUGOU: ZoneQuartier[] = [
  {
    id: 'karpala',
    nom: 'Karpala',
    villeId: 'ouagadougou',
    centre: { latitude: 12.33, longitude: -1.505 },
    polygone: [
      [-1.52, 12.318],
      [-1.49, 12.318],
      [-1.49, 12.342],
      [-1.52, 12.342],
      [-1.52, 12.318],
    ],
    statistiques: {
      nombreLogements: 48,
      prixMoyen: 35000,
      prixMin: 18000,
      prixMax: 75000,
      devise: 'FCFA',
      tauxEau: 78,
      tauxCourant: 91,
      tauxCertifie: 62,
      evolutionPrixPct: -2,
    },
    populaire: false,
  },
  {
    id: 'tampouy',
    nom: 'Tampouy',
    villeId: 'ouagadougou',
    centre: { latitude: 12.396, longitude: -1.532 },
    polygone: [
      [-1.555, 12.38],
      [-1.509, 12.38],
      [-1.509, 12.412],
      [-1.555, 12.412],
      [-1.555, 12.38],
    ],
    statistiques: {
      nombreLogements: 72,
      prixMoyen: 47000,
      prixMin: 22000,
      prixMax: 120000,
      devise: 'FCFA',
      tauxEau: 85,
      tauxCourant: 94,
      tauxCertifie: 71,
      evolutionPrixPct: +4,
    },
    populaire: true,
  },
  {
    id: 'ouaga2000',
    nom: 'Ouaga 2000',
    villeId: 'ouagadougou',
    centre: { latitude: 12.3447, longitude: -1.4569 },
    polygone: [
      [-1.475, 12.325],
      [-1.438, 12.325],
      [-1.438, 12.365],
      [-1.475, 12.365],
      [-1.475, 12.325],
    ],
    statistiques: {
      nombreLogements: 34,
      prixMoyen: 320000,
      prixMin: 120000,
      prixMax: 1200000,
      devise: 'FCFA',
      tauxEau: 97,
      tauxCourant: 99,
      tauxCertifie: 88,
      evolutionPrixPct: +8,
    },
    populaire: true,
  },
  {
    id: 'wemtenga',
    nom: 'Wemtenga',
    villeId: 'ouagadougou',
    centre: { latitude: 12.3552, longitude: -1.5421 },
    polygone: [
      [-1.565, 12.34],
      [-1.52, 12.34],
      [-1.52, 12.37],
      [-1.565, 12.37],
      [-1.565, 12.34],
    ],
    statistiques: {
      nombreLogements: 29,
      prixMoyen: 82000,
      prixMin: 35000,
      prixMax: 280000,
      devise: 'FCFA',
      tauxEau: 88,
      tauxCourant: 92,
      tauxCertifie: 74,
      evolutionPrixPct: +1,
    },
    populaire: false,
  },
  {
    id: 'zogona',
    nom: 'Zogona',
    villeId: 'ouagadougou',
    centre: { latitude: 12.3411, longitude: -1.5301 },
    polygone: [
      [-1.55, 12.328],
      [-1.51, 12.328],
      [-1.51, 12.354],
      [-1.55, 12.354],
      [-1.55, 12.328],
    ],
    statistiques: {
      nombreLogements: 55,
      prixMoyen: 95000,
      prixMin: 40000,
      prixMax: 450000,
      devise: 'FCFA',
      tauxEau: 90,
      tauxCourant: 95,
      tauxCertifie: 79,
      evolutionPrixPct: +3,
    },
    populaire: true,
  },
  {
    id: 'pissy',
    nom: 'Pissy',
    villeId: 'ouagadougou',
    centre: { latitude: 12.3608, longitude: -1.5689 },
    polygone: [
      [-1.585, 12.345],
      [-1.552, 12.345],
      [-1.552, 12.377],
      [-1.585, 12.377],
      [-1.585, 12.345],
    ],
    statistiques: {
      nombreLogements: 41,
      prixMoyen: 28000,
      prixMin: 15000,
      prixMax: 65000,
      devise: 'FCFA',
      tauxEau: 68,
      tauxCourant: 82,
      tauxCertifie: 51,
      evolutionPrixPct: -1,
    },
    populaire: false,
  },
  {
    id: 'gounghin',
    nom: 'Gounghin',
    villeId: 'ouagadougou',
    centre: { latitude: 12.3669, longitude: -1.5489 },
    polygone: [
      [-1.562, 12.354],
      [-1.536, 12.354],
      [-1.536, 12.38],
      [-1.562, 12.38],
      [-1.562, 12.354],
    ],
    statistiques: {
      nombreLogements: 37,
      prixMoyen: 32000,
      prixMin: 12000,
      prixMax: 80000,
      devise: 'FCFA',
      tauxEau: 74,
      tauxCourant: 86,
      tauxCertifie: 55,
      evolutionPrixPct: 0,
    },
    populaire: false,
  },
];

/** Villes du Burkina Faso (vue nationale) */
export const VILLES_BURKINA: ZoneVille[] = [
  {
    id: 'ouagadougou',
    nom: 'Ouagadougou',
    centre: { latitude: 12.3714, longitude: -1.5197 },
    polygone: [
      [-1.66, 12.28],
      [-1.38, 12.28],
      [-1.38, 12.46],
      [-1.66, 12.46],
      [-1.66, 12.28],
    ],
    statistiques: {
      nombreLogements: 316,
      prixMoyen: 68000,
      prixMin: 12000,
      prixMax: 1200000,
      devise: 'FCFA',
      tauxEau: 83,
      tauxCourant: 91,
      tauxCertifie: 69,
      evolutionPrixPct: +5,
    },
    quartiersPopulaires: ['Ouaga 2000', 'Tampouy', 'Zogona'],
  },
  {
    id: 'bobo-dioulasso',
    nom: 'Bobo-Dioulasso',
    centre: { latitude: 11.1771, longitude: -4.2979 },
    polygone: [
      [-4.42, 11.08],
      [-4.18, 11.08],
      [-4.18, 11.28],
      [-4.42, 11.28],
      [-4.42, 11.08],
    ],
    statistiques: {
      nombreLogements: 128,
      prixMoyen: 52000,
      prixMin: 15000,
      prixMax: 450000,
      devise: 'FCFA',
      tauxEau: 77,
      tauxCourant: 88,
      tauxCertifie: 54,
      evolutionPrixPct: +3,
    },
    quartiersPopulaires: ['Koko', 'Accart-Ville', 'Dioulassoba'],
  },
  {
    id: 'koudougou',
    nom: 'Koudougou',
    centre: { latitude: 12.25, longitude: -2.3633 },
    polygone: [
      [-2.48, 12.16],
      [-2.24, 12.16],
      [-2.24, 12.34],
      [-2.48, 12.34],
      [-2.48, 12.16],
    ],
    statistiques: {
      nombreLogements: 47,
      prixMoyen: 28000,
      prixMin: 10000,
      prixMax: 120000,
      devise: 'FCFA',
      tauxEau: 70,
      tauxCourant: 81,
      tauxCertifie: 42,
      evolutionPrixPct: +1,
    },
    quartiersPopulaires: ['Secteur 1', 'Secteur 5', 'Colsama'],
  },
  {
    id: 'banfora',
    nom: 'Banfora',
    centre: { latitude: 10.6333, longitude: -4.7667 },
    polygone: [
      [-4.92, 10.52],
      [-4.61, 10.52],
      [-4.61, 10.75],
      [-4.92, 10.75],
      [-4.92, 10.52],
    ],
    statistiques: {
      nombreLogements: 31,
      prixMoyen: 22000,
      prixMin: 8000,
      prixMax: 90000,
      devise: 'FCFA',
      tauxEau: 65,
      tauxCourant: 76,
      tauxCertifie: 35,
      evolutionPrixPct: +2,
    },
    quartiersPopulaires: ['Centre', 'Secteur 4', 'Niangoloko Rd'],
  },
  {
    id: 'ouahigouya',
    nom: 'Ouahigouya',
    centre: { latitude: 13.5833, longitude: -2.4167 },
    polygone: [
      [-2.55, 13.48],
      [-2.28, 13.48],
      [-2.28, 13.68],
      [-2.55, 13.68],
      [-2.55, 13.48],
    ],
    statistiques: {
      nombreLogements: 24,
      prixMoyen: 19000,
      prixMin: 7000,
      prixMax: 75000,
      devise: 'FCFA',
      tauxEau: 61,
      tauxCourant: 72,
      tauxCertifie: 29,
      evolutionPrixPct: 0,
    },
    quartiersPopulaires: ['Centre-ville', 'Secteur 3', 'Secteur 7'],
  },
];

/** Points d'intérêt seed pour Ouagadougou */
export const POINTS_INTERET_OUAGA: PointInteret[] = [
  {
    id: 'chu-yalgado',
    nom: 'CHU Yalgado Ouédraogo',
    categorie: 'hopital',
    coordonnees: { latitude: 12.368, longitude: -1.514 },
  },
  {
    id: 'chu-bogodogo',
    nom: 'CHU Bogodogo',
    categorie: 'hopital',
    coordonnees: { latitude: 12.329, longitude: -1.538 },
  },
  {
    id: 'upb',
    nom: 'Université Pr. Joseph Ki-Zerbo',
    categorie: 'universite',
    coordonnees: { latitude: 12.3731, longitude: -1.5042 },
  },
  {
    id: 'upo',
    nom: 'Université Ouaga II',
    categorie: 'universite',
    coordonnees: { latitude: 12.3205, longitude: -1.5321 },
  },
  {
    id: 'lycee-ph',
    nom: 'Lycée Philippe Zinda Kaboré',
    categorie: 'ecole',
    coordonnees: { latitude: 12.3645, longitude: -1.5089 },
  },
  {
    id: 'marche-roodwoko',
    nom: 'Marché Roodwoko',
    categorie: 'marche',
    coordonnees: { latitude: 12.3621, longitude: -1.5188 },
  },
  {
    id: 'marche-gounghin',
    nom: 'Grand Marché de Gounghin',
    categorie: 'marche',
    coordonnees: { latitude: 12.3648, longitude: -1.5461 },
  },
  {
    id: 'marche-pissy',
    nom: 'Marché de Pissy',
    categorie: 'marche',
    coordonnees: { latitude: 12.3594, longitude: -1.572 },
  },
];
