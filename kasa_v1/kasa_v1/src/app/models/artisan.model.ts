/**
 * Modèles liés au Module Artisans & Services (section 9 du concept KaSa).
 * Un artisan = un métier principal, rattaché à un quartier, géolocalisé,
 * mis en relation par WhatsApp, avec tarification régulée et réputation.
 */

export type Metier =
  | 'Électricité'
  | 'Plomberie'
  | 'Peinture'
  | 'Climatisation'
  | 'Nettoyage'
  | 'Gardiennage'
  | 'Chauffeur'
  | 'Déménagement'
  | 'Internet & TV'
  | 'Livraison meubles'
  | 'Décoration'
  | 'Sécurité & Caméras'
  | 'Maçonnerie'
  | 'Menuiserie'
  | 'Jardinage'
  // ── Services urgents (contexte Ouagadougou) ──
  | 'Vidange fosse & WC'
  | 'Débouchage canalisation'
  | 'Serrurerie'
  | 'Groupe électrogène'
  | 'Forage & pompe à eau'
  | 'Dératisation & désinsectisation'
  | 'Soudure & ferronnerie';

export type TypeTarification = 'forfait' | 'horaire' | 'au_m2';

/** Prestation proposée par un artisan, avec prix de référence régulé (pas de négociation libre) */
export interface Prestation {
  libelle: string;
  prixReference: number;
  devise: string;
  typeTarification: TypeTarification;
}

/** Répartition de la réputation par critère, affichée dans le détail du profil (calculée depuis les avis) */
export interface StatReputation {
  travailBienFait: number;
  bonPrix: number;
  interventionRapide: number;
  travailMalFait: number;
  prixEleve: number;
}

/** Avis laissé par un client (lecture seule pour l'artisan, alimenté par les demandes traitées) */
export interface Avis {
  auteur: string;
  initiales: string;
  date: string;
  note: number;
  texte: string;
}

export interface Artisan {
  id: string;
  nom: string;
  initiales: string;
  /** Couleur d'avatar utilisée sur la liste/détail quand aucune photo n'est renseignée */
  couleurAvatar: string;
  metier: Metier;
  /** Sous-titre court affiché sous le nom sur la liste et le détail (ex : "Dépannage & installation") */
  specialite: string;
  /** Présentation détaillée affichée dans le profil complet */
  description: string;
  /** 2-3 informations clés propres au métier, mises en avant sur la carte de la liste */
  pointsForts: string[];
  anneesExperience: number;
  quartier: string;
  /** Optionnel — non renseigné pour les artisans qui n'ont pas encore de géolocalisation précise */
  ville?: string;
  latitude?: number;
  longitude?: number;
  /** Numéro WhatsApp lié au profil, utilisé pour la mise en relation */
  whatsapp: string;
  photoUrl?: string;
  /** Statut de vérification (identité confirmée) — contrôlé par KaSa, non modifiable par l'artisan */
  estVerifie: boolean;
  note: number;
  nombreAvis: number;
  /** Historique du nombre d'interventions — identifie les artisans les plus actifs */
  nombreInterventions: number;
  /** Répartition détaillée de la réputation — calculée depuis les avis, non modifiable par l'artisan */
  reputation: StatReputation;
  avis: Avis[];
  prestations: Prestation[];
  disponible: boolean;
}

/** Champs du profil qu'un artisan connecté peut modifier lui-même (le reste est calculé ou contrôlé par KaSa) */
export type ProfilArtisanModifiable = Pick<
  Artisan,
  | 'nom'
  | 'metier'
  | 'specialite'
  | 'description'
  | 'pointsForts'
  | 'anneesExperience'
  | 'quartier'
  | 'ville'
  | 'whatsapp'
  | 'photoUrl'
  | 'couleurAvatar'
>;

/** Filtre de recherche du module Artisans & Services */
export interface FiltresArtisan {
  metier?: Metier;
  quartier?: string;
  disponibleUniquement?: boolean;
}

/** Demande de mise en relation transmise à l'artisan (bascule immédiate vers WhatsApp) */
export interface DemandeArtisan {
  artisanId: string;
  besoin: string;
  positionLibelle: string;
}
