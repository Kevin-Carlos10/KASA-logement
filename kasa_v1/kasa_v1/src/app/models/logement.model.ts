/**
 * Modèles liés aux logements affichés dans la liste et sur la carte.
 * Version KaSa — certification "Annonce Vérifiée", transparence totale,
 * réputation propriétaire + agent, signalement, historique prix.
 */

/**
 * Statut réel du bailleur vis-à-vis de la plateforme :
 * - autonome            : le bailleur a un compte, l'utilise, répond lui-même.
 * - represente_par_agent : le bailleur existe et a donné son accord, mais ne
 *   touche jamais l'appli (pas de smartphone adapté, ne lit/parle pas le
 *   français, ou ne veut simplement pas gérer une appli). L'agent terrain
 *   gère l'annonce et le contact en son nom.
 * - non_verifie         : on ne dispose pas d'assez d'informations fiables
 *   sur le bailleur pour lui attribuer une note ou un historique. La
 *   confiance repose alors uniquement sur la vérification terrain du
 *   logement (factures, vidéo, GPS) et sur l'agent.
 */
export type StatutBailleur = 'autonome' | 'represente_par_agent' | 'non_verifie';

export interface Hote {
  nom: string;
  initiales: string;
  estVerifie: boolean;
  photoUrl?: string;
  note: number;
  nombreAvis: number;
  /** Niveau de confiance affiché sur la fiche (0-5) */
  niveauConfiance?: number;
  membreDepuis?: string;
  nombreAnnonces?: number;
  /** Statut réel du bailleur — pilote l'affichage côté locataire (défaut : 'autonome') */
  statut?: StatutBailleur;
  /** Langue(s) parlée(s) par le bailleur, à titre informatif avant contact */
  langueParlee?: string;
  /** true si toute mise en relation doit obligatoirement passer par l'agent terrain */
  contactUniquementViaAgent?: boolean;
}

/** Note détaillée du propriétaire (attribuée par les locataires) */
export interface NoteProprietaire {
  respectConditions: number;
  disponibiliteLogement: number;
  honneteteInfos: number;
  reactivite: number;
  /** Moyenne calculée */
  moyenne: number;
}

/** Note détaillée de l'agent terrain (attribuée par les visiteurs) */
export interface NoteAgent {
  qualiteAccompagnement: number;
  ponctualite: number;
  exactitudeInfos: number;
  comportementProfessionnel: number;
  /** Nombre total de visites effectuées */
  nombreVisites: number;
  /** Moyenne calculée */
  moyenne: number;
  nomAgent?: string;
  initialesAgent?: string;
}

export type TypeBien = 'Studio' | 'Chambre' | 'Appartement' | 'Magasin' | 'Mini villa' | 'Villa';

export type TypeLocation = 'Célibat' | 'Famille' | 'Colocation';

/** ── 1. CERTIFICATION : Informations du logement ── */

/** Surface du logement */
export interface SurfaceLogement {
  valeurM2: number;
  /** Détail éventuel : surface habitable, surface totale */
  detail?: string;
}

/** ── 1. CERTIFICATION : Eau ── */
export type DisponibiliteEau = 'oui' | 'non' | 'intermittent';
export type TypeCompteurEau = 'individuel' | 'partage';

export interface InfoEau {
  disponibilite: DisponibiliteEau;
  typeCompteur: TypeCompteurEau;
  /** URL de la dernière facture ONEA (obligatoire) */
  derniereFactureUrl?: string;
  derniereFactureStatut?: string;
  /** Date ISO du dernier paiement de la facture d'eau (transparence : factures à jour) */
  dernierePaiementDate?: string;
  /** Fréquence coupures signalée par anciens locataires */
  frequenceCoupures?: 'jamais' | 'rarement' | 'parfois' | 'souvent';
  /** Texte libre sur les coupures signalées */
  coupuresDetail?: string;
}

/** ── 1. CERTIFICATION : Électricité ── */
export type DisponibiliteElectricite = 'oui' | 'non' | 'intermittent';
export type TypeCompteurElec = 'individuel' | 'partage';

export interface InfoElectricite {
  disponibilite: DisponibiliteElectricite;
  typeCompteur: TypeCompteurElec;
  estCashPower: boolean;
  /** Si CASH POWER → montant mensuel des redevances (obligatoire) */
  montantRedevancesMensuels?: number;
  /** Si NON CASH POWER → URL dernière facture SONABEL (obligatoire) */
  derniereFactureUrl?: string;
  derniereFactureStatut?: string;
  /** Date ISO de la dernière facture SONABEL (transparence : facture à jour) */
  derniereFactureDate?: string;
  frequenceCoupures?: 'jamais' | 'rarement' | 'parfois' | 'souvent';
}

/** ── 2. TRANSPARENCE : Historique des prix ── */
export interface EntreeHistoriquePrix {
  date: string;
  prix: number;
  devise: string;
  motif?: string;
}

/** ── 3. RÉPUTATION : Historique du score de confiance BBV ── */
export interface EntreeHistoriqueBBV {
  date: string;
  score: number;
  motif?: string;
  icone?: string;
}

/** ── 3. RÉPUTATION : Avis ancien locataire (obligatoire après départ) ── */
export interface AvisLocataire {
  initiales: string;
  auteur: string;
  date: string;
  note: number;
  commentaire: string;
  /** Notes thématiques obligatoires après départ */
  noteEau?: number;
  noteCourant?: number;
  noteSecurity?: number;
  noteBailleur?: number;
  noteVoisinage?: number;
  noteProprete?: number;
}

/** ── 6. SIGNALEMENT ── */
export type TypeSignalement =
  | 'changement_prix'
  | 'changement_conditions'
  | 'fausse_annonce'
  | 'absence_eau'
  | 'absence_courant'
  | 'probleme_securite';

export interface Signalement {
  type: TypeSignalement;
  date: string;
  description?: string;
  statut: 'recu' | 'en_cours_verification' | 'resolu' | 'annonce_suspendue';
}

/** ── 4. RECHERCHE PAR PROXIMITÉ ── */
export interface LieuProximite {
  libelle: string;
  categorie: 'travail' | 'ecole' | 'marche' | 'hopital' | 'autre';
  distanceKm: number;
  /** Temps de trajet estimé (en minutes) */
  tempsTrajetMinutes: number;
  coordonnees?: { latitude: number; longitude: number };
}

/** ── 8. OUTILS FINANCIERS : Caution alternative (cotisation mensuelle) ── */
export interface CautionAlternative {
  /** Le bailleur accepte-t-il de remplacer la caution classique par une cotisation ? */
  disponible: boolean;
  /** Montant de la petite cotisation mensuelle proposée en remplacement de la caution bloquée */
  cotisationMensuelle: number;
  /** Nombre de mois de loyer normalement bloqués que ce dispositif évite (souvent 2 à 3) */
  moisCautionEvites: number;
}

/** ── Données génériques conservées ── */

export interface VerificationConfiance {
  libelle: string;
  detail: string;
  validee: boolean;
}

export interface PointProche {
  icone: string;
  label: string;
}

export interface FactureService {
  fournisseur: string;
  imageUrl: string;
  statut: string;
}

export interface RepartitionNotes {
  [note: number]: number;
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface PhotoVisite3D {
  label: string;
  imageUrl: string;
}

/** ── MODÈLE PRINCIPAL ── */
export interface Logement {
  id: string;
  titre?: string;
  /** true = visible sur la liste visiteurs ; false = masquée */
  estActif: boolean;
  quartier: string;
  ville: string;
  typeBien: TypeBien;
  typeLocation: TypeLocation;
  prix: number;
  devise: string;
  /** Commission KaSa = 25% d'un mois de loyer */
  commissionKasa?: number;
  distanceKm: number;
  nombreChambres: number;
  description: string;
  equipements: string[];
  images: string[];
  hote: Hote;
  publieDepuis: string;
  /** Date ISO de création de l'annonce (obligatoire — transparence totale) */
  dateCreation?: string;
  /** Date ISO de la dernière modification — l'activation n'est possible que si < 6 mois */
  dateModification?: string;
  /** Nombre de visites de la fiche (transparence totale) */
  nombreVisites?: number;
  latitude: number;
  longitude: number;
  adresse?: string;

  /** Cuisine intégrée dans le logement */
  cuisine?: boolean;
  /** WC interne */
  wcInterne?: boolean;
  /** Douche interne */
  doucheInterne?: boolean;

  // ── 1. CERTIFICATION ──
  /** Surface du logement (obligatoire pour certification) */
  surface?: SurfaceLogement;
  /** Conditions de location (obligatoires pour certification) */
  conditionsLocation?: string;
  /** GPS exact vérifié par l'agent */
  gpsVerifie?: boolean;
  /** Durée de la vidéo walkthrough, en secondes (obligatoire) */
  videoDureeSecondes?: number;
  /** URL de la vidéo walkthrough (mp4, etc.) */
  videoUrl?: string;
  visite3D?: PhotoVisite3D[];
  /** Infos eau (obligatoires pour certification) */
  infoEau?: InfoEau;
  /** Infos électricité (obligatoires pour certification) */
  infoElectricite?: InfoElectricite;
  /** true si l'annonce a passé les 100% de vérification */
  annonceCertifiee?: boolean;

  // ── 2. TRANSPARENCE ──
  /** Historique complet des modifications de prix */
  historiquePrix?: EntreeHistoriquePrix[];
  /** Factures de services (ONEA, SONABEL) */
  factures?: FactureService[];

  // ── 3. RÉPUTATION ──
  scoreConfiance?: number;
  /** Historique de l'évolution du score de confiance BBV */
  historiqueBBV?: EntreeHistoriqueBBV[];
  verifications?: VerificationConfiance[];
  noteProprietaire?: NoteProprietaire;
  noteAgent?: NoteAgent;
  /** Avis des locataires (inclut notes thématiques) */
  avis?: AvisLocataire[];
  repartitionNotes?: RepartitionNotes;

  // ── 4. PROXIMITÉ ──
  lieuxProximite?: LieuProximite[];
  pointsProches?: PointProche[];

  // ── 6. SIGNALEMENT ──
  signalements?: Signalement[];

  // ── 8. OUTILS FINANCIERS ──
  /** Option activable ou non, au choix du bailleur (remplace caution + avance classiques) */
  cautionAlternative?: CautionAlternative;
}

/**
 * Données saisies par le gérant (bailleur ou agent terrain) dans le
 * formulaire de création / édition d'un logement (espace `/gerant`).
 *
 * Ce formulaire est volontairement structuré dans le MÊME ordre que les
 * catégories de `Logement` ci-dessus (identification → prix → localisation
 * → certification eau/électricité → médias → options financières) : c'est
 * la « règle de structuration » qui garantit que toute nouvelle annonce
 * respecte le contrat de certification/transparence de la plateforme.
 */
export interface DonneesLogementFormulaire {
  // ── 0. Qui gère cette annonce ──
  /** true = le gérant est lui-même le bailleur ; false = il agit comme agent pour un tiers */
  enTantQueBailleur: boolean;
  /** Obligatoire si enTantQueBailleur = false */
  nomBailleur?: string;
  langueBailleur?: string;

  // ── Identification ──
  typeBien: TypeBien;
  typeLocation: TypeLocation;
  quartier: string;
  ville: string;
  adresse?: string;
  nombreChambres: number;
  surfaceM2?: number;

  // ── Prix & conditions ──
  prix: number;
  devise: string;
  conditionsLocation?: string;
  motifPrix?: string;

  // ── Localisation (renseignée via le pointeur sur la carte) ──
  latitude?: number;
  longitude?: number;

  // ── Description ──
  description: string;
  equipements: string[];

  // ── Intérieur ──
  cuisine: boolean;
  wcInterne: boolean;
  doucheInterne: boolean;

  // ── Médias ──
  images: string[];
  videoUrl?: string;
  videoDureeSecondes?: number;

  // ── 1. Certification eau / électricité ──
  infoEau: InfoEau;
  /** Date ISO de la dernière facture ONEA (obligatoire) */
  dateFactureOnea: string;
  infoElectricite: InfoElectricite;
  /** Date ISO de la dernière facture SONABEL (obligatoire) */
  dateFactureSonabel: string;

  // ── 8. Options financières ──
  cautionAlternative?: CautionAlternative;
}

/**
 * Filtres applicables à la recherche de logements.
 */
export interface FiltresLogement {
  texte?: string;
  typeBien?: TypeBien;
  /** Quartier de préférence (nom exact). Vide/absent = tous les quartiers. */
  quartier?: string;
  prixMax?: number;
  nombreChambresMin?: number;
  disponibiliteEau?: boolean;
  disponibiliteElectricite?: boolean;
  annonceCertifiee?: boolean;
  bornesCarte?: {
    nord: number;
    sud: number;
    est: number;
    ouest: number;
  };
}
