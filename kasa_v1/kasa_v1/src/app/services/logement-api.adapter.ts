/**
 * Adaptateur API Django (snake_case) → modèle Angular `Logement`.
 *
 * Le backend actuel stocke un sous-ensemble des champs riches attendus par
 * l'UI (certification, réputation détaillée, proximité, avis thématiques…).
 * On mappe fidèlement ce qui existe et on fournit des valeurs par défaut
 * sûres (tableaux vides / undefined) pour le reste, afin que les gabarits
 * qui utilisent `?.` / `*ngIf` ne cassent jamais.
 */
import { API_BASE_URL } from '../config/api.config';
import {
  InfoEau,
  InfoElectricite,
  Logement,
  TypeBien,
  TypeLocation,
} from '../models/logement.model';

/** Origine du backend (sans le suffixe /api) pour préfixer les médias. */
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

/** Images de repli quand le backend n'a pas encore de photos. */
const IMAGES_PLACEHOLDER = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
  'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200',
];

const TYPE_BIEN: Record<string, TypeBien> = {
  studio: 'Studio',
  chambre_salon: 'Chambre',
  appartement: 'Appartement',
  villa: 'Villa',
  maison_cour_commune: 'Chambre',
  autre: 'Studio',
};

function toTypeBien(t: string): TypeBien {
  return TYPE_BIEN[t] ?? 'Studio';
}

function nombre(v: unknown, defaut = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : defaut;
}

function urlMedia(chemin: string | null | undefined): string | null {
  if (!chemin) return null;
  if (/^https?:\/\//i.test(chemin)) return chemin;
  return `${BACKEND_ORIGIN}${chemin.startsWith('/') ? '' : '/'}${chemin}`;
}

/** DTO liste renvoyé par /api/properties/logements/ */
export interface PropertyListDTO {
  id: string;
  type_logement: string;
  quartier: string;
  quartier_nom: string;
  prix: string | number;
  surface_m2: string | number;
  acces_goudron: boolean;
  latitude: string | number;
  longitude: string | number;
  is_verified: boolean;
  date_publication: string;
  photo_principale: string | null;
  note_moyenne_avis: number | null;
}

export interface PaginatedDTO<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Construit un `Logement` complet (défauts sûrs) à partir de la vue liste. */
export function mapPropertyListToLogement(dto: PropertyListDTO, index = 0): Logement {
  const image = urlMedia(dto.photo_principale) ??
    IMAGES_PLACEHOLDER[index % IMAGES_PLACEHOLDER.length];

  return {
    id: dto.id,
    quartier: dto.quartier_nom ?? '',
    ville: 'Ouagadougou',
    typeBien: toTypeBien(dto.type_logement),
    typeLocation: 'Famille' as TypeLocation,
    prix: nombre(dto.prix),
    devise: 'FCFA',
    distanceKm: 0,
    nombreChambres: 1,
    description: '',
    equipements: [],
    images: [image],
    hote: {
      nom: 'Bailleur KaSa',
      initiales: 'BK',
      estVerifie: !!dto.is_verified,
      note: dto.note_moyenne_avis ?? 0,
      nombreAvis: 0,
    },
    publieDepuis: dto.date_publication ?? '',
    estActif: true,
    dateCreation: dto.date_publication,
    latitude: nombre(dto.latitude),
    longitude: nombre(dto.longitude),
    surface: { valeurM2: nombre(dto.surface_m2) },
    annonceCertifiee: !!dto.is_verified,
    scoreConfiance: dto.note_moyenne_avis ? dto.note_moyenne_avis * 2 : undefined,
    // Champs riches non fournis par la vue liste : défauts sûrs
    avis: [],
    verifications: [],
    historiquePrix: [],
    lieuxProximite: [],
    signalements: [],
  };
}

/** DTO détail renvoyé par /api/properties/logements/{id}/ */
export interface PropertyDetailDTO extends PropertyListDTO {
  bailleur: string;
  agent_terrain: string | null;
  quartier_detail?: { id: string; nom: string; ville: string; arrondissement?: string };
  conditions_location?: string;
  video_url?: string;
  commission_kasa_pourcentage?: string | number;
  commission_kasa_montant?: number;
  acces_goudron: boolean;
  photos?: { id: string; image: string; piece?: string; uploaded_at?: string }[];
  water_info?: {
    disponible: boolean;
    type_compteur: 'individuel' | 'partage';
    derniere_facture_onea?: string;
    frequence_coupures?: string;
  } | null;
  electricity_info?: {
    disponible: boolean;
    type_compteur: 'individuel' | 'partage';
    type_alimentation: 'cash_power' | 'classique';
    derniere_facture_sonabel?: string | null;
    montant_moyen_redevance?: string | number | null;
  } | null;
  price_history?: {
    ancien_prix: string | number;
    nouveau_prix: string | number;
    justification?: string;
    changed_at: string;
  }[];
}

const FREQ = new Set(['jamais', 'rarement', 'parfois', 'souvent']);
function freq(v?: string): 'jamais' | 'rarement' | 'parfois' | 'souvent' | undefined {
  return v && FREQ.has(v) ? (v as any) : undefined;
}

/** Construit un `Logement` détaillé à partir de la vue détail. */
export function mapPropertyDetailToLogement(dto: PropertyDetailDTO): Logement {
  const base = mapPropertyListToLogement(dto);

  const images = (dto.photos ?? [])
    .map((p) => urlMedia(p.image))
    .filter((u): u is string => !!u);

  let infoEau: InfoEau | undefined;
  if (dto.water_info) {
    infoEau = {
      disponibilite: dto.water_info.disponible ? 'oui' : 'non',
      typeCompteur: dto.water_info.type_compteur,
      derniereFactureUrl: urlMedia(dto.water_info.derniere_facture_onea) ?? undefined,
      frequenceCoupures: freq(dto.water_info.frequence_coupures),
    };
  }

  let infoElectricite: InfoElectricite | undefined;
  if (dto.electricity_info) {
    const e = dto.electricity_info;
    infoElectricite = {
      disponibilite: e.disponible ? 'oui' : 'non',
      typeCompteur: e.type_compteur,
      estCashPower: e.type_alimentation === 'cash_power',
      montantRedevancesMensuels:
        e.montant_moyen_redevance != null ? nombre(e.montant_moyen_redevance) : undefined,
      derniereFactureUrl: urlMedia(e.derniere_facture_sonabel) ?? undefined,
    };
  }

  const historiquePrix = (dto.price_history ?? []).map((h) => ({
    date: (h.changed_at ?? '').slice(0, 10),
    prix: nombre(h.nouveau_prix),
    devise: 'FCFA',
    motif: h.justification || undefined,
  }));

  return {
    ...base,
    images: images.length ? images : base.images,
    quartier: dto.quartier_detail?.nom ?? base.quartier,
    ville: dto.quartier_detail?.ville ?? base.ville,
    conditionsLocation: dto.conditions_location,
    videoUrl: dto.video_url || undefined,
    commissionKasa: dto.commission_kasa_montant,
    infoEau,
    infoElectricite,
    historiquePrix,
  };
}
