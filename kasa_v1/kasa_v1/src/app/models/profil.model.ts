import { AvisLocataire, Logement, StatutBailleur } from './logement.model';

export type TypeProfil = 'bailleur' | 'agent';

/** Un critère de notation détaillé affiché sous forme de barre (réutilisé bailleur + agent). */
export interface CritereNote {
  label: string;
  valeur: number;
}

/**
 * Un changement remonté par l'agent depuis le terrain : changement de prix,
 * de conditions, coupure d'eau/courant signalée, etc. Agrégé à partir de
 * `historiquePrix` et `signalements` de chaque logement qu'il gère.
 */
export interface ChangementTerrain {
  date: string;
  type: string;
  description: string;
  quartier: string;
  logementId: string;
}

/**
 * Profil public consultable par le locataire, agrégé à partir de toutes
 * les annonces liées à cette personne (pas encore d'entité back-end dédiée :
 * on regroupe par nom le temps que l'API expose de vrais id bailleur/agent).
 */
/**
 * Données agrégées affichées dans l'espace privé du gérant connecté
 * (tableau de bord, distinct du profil public `ProfilPersonne` consulté
 * par un locataire). Regroupe tout logement dont le gérant est soit le
 * bailleur (hote.nom), soit l'agent terrain rattaché (noteAgent.nomAgent).
 */
export interface EspaceGerant {
  nom: string;
  initiales: string;
  logements: Logement[];
  quartiersCouverts: string[];
  noteMoyenne: number;
  nombreAvis: number;
  nombreVisites: number;
  nombreInterventions: number;
  changementsTerrain: ChangementTerrain[];
}

export interface ProfilPersonne {
  type: TypeProfil;
  id: string;
  nom: string;
  initiales: string;
  photoUrl?: string;
  estVerifie: boolean;
  membreDepuis?: string;
  niveauConfiance?: number;
  /** Uniquement pour un profil bailleur */
  statutBailleur?: StatutBailleur;
  langueParlee?: string;
  noteMoyenne: number;
  nombreAvis: number;
  nombreAnnonces: number;
  /** Uniquement pour un profil agent */
  nombreVisites?: number;
  /** Nombre total d'interventions terrain (visites accompagnées + changements remontés) */
  nombreInterventions?: number;
  /** Quartiers où cet agent/bailleur a des annonces actives */
  quartiersCouverts?: string[];
  /** Changements remontés du terrain (prix, conditions, coupures signalées...) */
  changementsTerrain?: ChangementTerrain[];
  criteres: CritereNote[];
  logements: Logement[];
  avis: AvisLocataire[];
}
