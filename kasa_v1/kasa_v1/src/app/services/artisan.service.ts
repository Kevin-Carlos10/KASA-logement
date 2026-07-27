import { Injectable, signal } from '@angular/core';
import {
  Artisan,
  DemandeArtisan,
  FiltresArtisan,
  Metier,
  Prestation,
  ProfilArtisanModifiable,
} from '../models/artisan.model';
import { slugifier } from '../utils/slug';

/** Demande de mise en relation reçue, affichée dans l'espace artisan (mock local, pas de back-end). */
export interface DemandeArtisanRecue extends DemandeArtisan {
  id: string;
  date: string;
  nomClient: string;
  statut: 'en_attente' | 'traitee';
}

/**
 * Service de données pour le Module Artisans & Services.
 * Source unique de vérité pour l'annuaire public (/artisans), le détail
 * logement (artisans recommandés) et l'espace artisan connecté (/artisan) :
 * un artisan qui remplit son profil dans son espace voit ses informations
 * apparaître exactement telles quelles dans la liste et le détail.
 * Remplacer `this.artisansMock` par un appel http.get<Artisan[]>(url) quand l'API sera prête.
 */
@Injectable({ providedIn: 'root' })
export class ArtisanService {
  readonly metiers: Metier[] = [
    'Vidange fosse & WC',
    'Débouchage canalisation',
    'Serrurerie',
    'Groupe électrogène',
    'Forage & pompe à eau',
    'Dératisation & désinsectisation',
    'Soudure & ferronnerie',
    'Déménagement',
    'Nettoyage',
    'Internet & TV',
    'Livraison meubles',
    'Décoration',
    'Sécurité & Caméras',
    'Électricité',
    'Plomberie',
    'Maçonnerie',
    'Menuiserie',
    'Peinture',
    'Climatisation',
    'Jardinage',
    'Gardiennage',
    'Chauffeur',
  ];

  private readonly artisansMock: Artisan[] = [
    {
      id: 'art-001',
      nom: 'Issouf Ouédraogo',
      initiales: 'IO',
      couleurAvatar: '#B45309',
      metier: 'Électricité',
      specialite: 'Dépannage & installation électrique',
      description:
        "Électricien agréé, intervention rapide sur pannes courantes et installation de compteurs individuels. Devis clair avant chaque intervention.",
      pointsForts: ['Agréé SONABEL', 'Intervention rapide', 'Devis avant travaux'],
      anneesExperience: 9,
      quartier: 'Ouaga 2000',
      ville: 'Ouagadougou',
      latitude: 12.3441,
      longitude: -1.4561,
      whatsapp: '+226 70 12 34 56',
      estVerifie: true,
      note: 4.8,
      nombreAvis: 41,
      nombreInterventions: 96,
      reputation: { travailBienFait: 95, bonPrix: 88, interventionRapide: 93, travailMalFait: 5, prixEleve: 11 },
      avis: [
        { auteur: 'Fatimata O.', initiales: 'FO', date: 'Juin 2025', note: 5, texte: 'Panne réglée en moins d\'une heure. Très professionnel.' },
        { auteur: 'Karim T.', initiales: 'KT', date: 'Mai 2025', note: 5, texte: 'Installation du compteur nickel, explications claires.' },
      ],
      disponible: true,
      prestations: [
        {
          libelle: 'Dépannage panne courante',
          prixReference: 5000,
          devise: 'FCFA',
          typeTarification: 'forfait',
        },
        {
          libelle: 'Installation compteur individuel',
          prixReference: 15000,
          devise: 'FCFA',
          typeTarification: 'forfait',
        },
        {
          libelle: 'Intervention horaire',
          prixReference: 2500,
          devise: 'FCFA',
          typeTarification: 'horaire',
        },
      ],
    },
    {
      id: 'art-002',
      nom: 'Awa Zongo',
      initiales: 'AZ',
      couleurAvatar: '#BE185D',
      metier: 'Nettoyage',
      specialite: 'Ménage résidentiel complet',
      description:
        "Ménage complet studio à villa, produits fournis. Ponctuelle et soigneuse, disponible en horaires flexibles.",
      pointsForts: ['Produits fournis', 'Horaires flexibles'],
      anneesExperience: 6,
      quartier: 'Kalgondin',
      ville: 'Ouagadougou',
      latitude: 12.3798,
      longitude: -1.497,
      whatsapp: '+226 76 22 44 10',
      estVerifie: true,
      note: 4.9,
      nombreAvis: 63,
      nombreInterventions: 210,
      reputation: { travailBienFait: 97, bonPrix: 92, interventionRapide: 89, travailMalFait: 3, prixEleve: 8 },
      avis: [
        { auteur: 'Aïcha K.', initiales: 'AK', date: 'Juin 2025', note: 5, texte: 'Toujours impeccable, je recommande sans hésiter.' },
      ],
      disponible: true,
      prestations: [
        {
          libelle: 'Ménage complet (studio/1 chambre)',
          prixReference: 4000,
          devise: 'FCFA',
          typeTarification: 'forfait',
        },
        {
          libelle: 'Ménage complet (villa)',
          prixReference: 9000,
          devise: 'FCFA',
          typeTarification: 'forfait',
        },
      ],
    },
    {
      id: 'art-003',
      nom: 'Boureima Sawadogo',
      initiales: 'BS',
      couleurAvatar: '#0F766E',
      metier: 'Plomberie',
      specialite: 'Réparation fuites & canalisations',
      description:
        "Plombier expérimenté pour fuites, débouchage et petite plomberie sanitaire. Intervention rapide sur rendez-vous.",
      pointsForts: ['Intervention rapide', 'Devis gratuit'],
      anneesExperience: 7,
      quartier: 'Tampouy',
      ville: 'Ouagadougou',
      latitude: 12.4021,
      longitude: -1.5312,
      whatsapp: '+226 71 88 09 22',
      estVerifie: true,
      note: 4.6,
      nombreAvis: 27,
      nombreInterventions: 58,
      reputation: { travailBienFait: 90, bonPrix: 85, interventionRapide: 88, travailMalFait: 8, prixEleve: 14 },
      avis: [
        { auteur: 'Moussa T.', initiales: 'MT', date: 'Mai 2025', note: 4, texte: 'Bon travail, un peu de retard sur le rendez-vous.' },
      ],
      disponible: false,
      prestations: [
        {
          libelle: 'Réparation fuite',
          prixReference: 3500,
          devise: 'FCFA',
          typeTarification: 'forfait',
        },
        {
          libelle: 'Débouchage canalisation',
          prixReference: 6000,
          devise: 'FCFA',
          typeTarification: 'forfait',
        },
      ],
    },
    {
      id: 'art-004',
      nom: 'Rasmané Kaboré',
      initiales: 'RK',
      couleurAvatar: '#374151',
      metier: 'Gardiennage',
      specialite: 'Gardiennage résidentiel de nuit',
      description:
        "Agent de sécurité agréé, garde de nuit villa et résidence. Sérieux et discret.",
      pointsForts: ['Agent agréé', 'Garde de nuit'],
      anneesExperience: 5,
      quartier: 'Ouaga 2000',
      ville: 'Ouagadougou',
      latitude: 12.3455,
      longitude: -1.4578,
      whatsapp: '+226 78 33 12 90',
      estVerifie: true,
      note: 4.7,
      nombreAvis: 19,
      nombreInterventions: 34,
      reputation: { travailBienFait: 92, bonPrix: 90, interventionRapide: 85, travailMalFait: 6, prixEleve: 9 },
      avis: [
        { auteur: 'Robert D.', initiales: 'RD', date: 'Avr. 2025', note: 5, texte: 'Ponctuel et sérieux, je dors tranquille.' },
      ],
      disponible: true,
      prestations: [
        {
          libelle: 'Garde de nuit (12h)',
          prixReference: 4000,
          devise: 'FCFA',
          typeTarification: 'forfait',
        },
      ],
    },
    {
      id: 'art-005',
      nom: 'Salif Nikiéma',
      initiales: 'SN',
      couleurAvatar: '#0E7490',
      metier: 'Climatisation',
      specialite: 'Entretien & dépannage climatiseur',
      description:
        "Technicien clim pour entretien, diagnostic panne et recharge gaz. Intervention à domicile.",
      pointsForts: ['Diagnostic gratuit', 'Recharge gaz sur place'],
      anneesExperience: 4,
      quartier: 'Kalgondin',
      ville: 'Ouagadougou',
      latitude: 12.3812,
      longitude: -1.4985,
      whatsapp: '+226 70 55 61 02',
      estVerifie: false,
      note: 4.3,
      nombreAvis: 11,
      nombreInterventions: 22,
      reputation: { travailBienFait: 87, bonPrix: 84, interventionRapide: 80, travailMalFait: 12, prixEleve: 16 },
      avis: [
        { auteur: 'Sandrine O.', initiales: 'SO', date: 'Mars 2025', note: 4, texte: 'Bon diagnostic, prix correct.' },
      ],
      disponible: true,
      prestations: [
        {
          libelle: 'Entretien climatiseur split',
          prixReference: 8000,
          devise: 'FCFA',
          typeTarification: 'forfait',
        },
        {
          libelle: 'Diagnostic panne',
          prixReference: 2000,
          devise: 'FCFA',
          typeTarification: 'forfait',
        },
      ],
    },

    // ── Annuaire public complémentaire (import du catalogue /artisans) ──


  // ══ DÉMÉNAGEMENT ══
  {
    id: 'dem-001', nom: 'Idrissa Ouédraogo', initiales: 'IO',
    couleurAvatar: '#0F766E', metier: 'Déménagement',
    specialite: 'Déménagement résidentiel & entreprise',
    quartier: 'Karpala — Sect. 30', whatsapp: '+226 70 11 22 33',
    note: 4.8, nombreAvis: 214, nombreInterventions: 312, estVerifie: true, disponible: true,
    anneesExperience: 8, description: 'Équipe de 4 personnes, camion 10T disponible. Emballage soigné, assurance incluse sur chaque déménagement.',
    pointsForts: ['Équipe de 4 personnes', 'Camion 10T', 'Assurance incluse'],
    reputation: { travailBienFait: 96, bonPrix: 90, interventionRapide: 92, travailMalFait: 4, prixEleve: 10 },
    prestations: [
      { libelle: 'Studio / F2', prixReference: 15000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'F3 / F4', prixReference: 25000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Grande villa', prixReference: 50000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Aïcha K.', initiales: 'AK', date: 'Mai 2025', note: 5, texte: 'Équipe ponctuelle, aucun objet abîmé. Je recommande vivement.' },
      { auteur: 'Moussa S.', initiales: 'MS', date: 'Avr. 2025', note: 5, texte: 'Rapides et professionnels. Prix correct pour la qualité.' },
      { auteur: 'Fatou D.', initiales: 'FD', date: 'Mar. 2025', note: 4, texte: 'Bonne prestation, ils auraient pu arriver 30 min plus tôt.' },
    ],
  },
  {
    id: 'dem-002', nom: 'Compaoré Déménagement', initiales: 'CD',
    couleurAvatar: '#1D4ED8', metier: 'Déménagement',
    specialite: 'Déménagement express & garde-meuble',
    quartier: 'Pissy — Sect. 14', whatsapp: '+226 76 44 55 66',
    note: 4.5, nombreAvis: 98, nombreInterventions: 145, estVerifie: true, disponible: true,
    anneesExperience: 5, description: 'Service rapide dans toute la ville. Option garde-meuble sécurisé disponible.',
    pointsForts: ['Service express (jour même)', 'Garde-meuble sécurisé'],
    reputation: { travailBienFait: 91, bonPrix: 87, interventionRapide: 95, travailMalFait: 9, prixEleve: 13 },
    prestations: [
      { libelle: 'Déménagement express (journée)', prixReference: 20000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Garde-meuble / mois', prixReference: 8000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Rachid B.', initiales: 'RB', date: 'Juin 2025', note: 5, texte: 'Service express très efficace, livraison dans les 3h.' },
      { auteur: 'Bintou Y.', initiales: 'BY', date: 'Mai 2025', note: 4, texte: 'Bien dans l\'ensemble, quelques petites égratignures sur un meuble.' },
    ],
  },

  // ══ NETTOYAGE ══
  {
    id: 'net-001', nom: 'Mariam Traoré', initiales: 'MT',
    couleurAvatar: '#BE185D', metier: 'Nettoyage',
    specialite: 'Nettoyage résidentiel & fin de chantier',
    quartier: 'Gounghin — Sect. 15', whatsapp: '+226 71 77 88 99',
    note: 4.9, nombreAvis: 387, nombreInterventions: 512, estVerifie: true, disponible: true,
    anneesExperience: 10, description: 'Cheffe d\'équipe certifiée. Matériel professionnel, produits écologiques. Disponible 6j/7.',
    pointsForts: ['Produits écologiques', 'Matériel professionnel', 'Disponible 6j/7'],
    reputation: { travailBienFait: 97, bonPrix: 93, interventionRapide: 90, travailMalFait: 3, prixEleve: 7 },
    prestations: [
      { libelle: 'Appartement F2', prixReference: 5000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Maison F4+', prixReference: 12000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Fin de chantier', prixReference: 20000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Nettoyage de vitres (m²)', prixReference: 500, devise: 'FCFA', typeTarification: 'au_m2' },
    ],
    avis: [
      { auteur: 'Sophie L.', initiales: 'SL', date: 'Juil. 2025', note: 5, texte: 'Impeccable. L\'appartement était comme neuf après son passage.' },
      { auteur: 'Omar C.', initiales: 'OC', date: 'Juin 2025', note: 5, texte: 'Sérieuse, ponctuelle, résultat parfait. 10/10.' },
      { auteur: 'Hawa Z.', initiales: 'HZ', date: 'Mai 2025', note: 5, texte: 'Meilleure prestataire de nettoyage que j\'ai eu.' },
    ],
  },
  {
    id: 'net-002', nom: 'Sanogo Propreté', initiales: 'SP',
    couleurAvatar: '#7C3AED', metier: 'Nettoyage',
    specialite: 'Nettoyage bureaux & espaces communs',
    quartier: 'Ouaga 2000 — Sect. 53', whatsapp: '+226 65 33 44 55',
    note: 4.6, nombreAvis: 142, nombreInterventions: 220, estVerifie: true, disponible: false,
    anneesExperience: 6, description: 'Spécialisé bureaux et immeubles. Contrats hebdomadaires possibles.',
    pointsForts: ['Spécialiste bureaux & immeubles', 'Contrats hebdomadaires'],
    reputation: { travailBienFait: 92, bonPrix: 86, interventionRapide: 88, travailMalFait: 8, prixEleve: 14 },
    prestations: [
      { libelle: 'Bureau (par heure)', prixReference: 2000, devise: 'FCFA', typeTarification: 'horaire' },
      { libelle: 'Immeuble (forfait mensuel)', prixReference: 45000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Kader N.', initiales: 'KN', date: 'Juin 2025', note: 5, texte: 'Notre bureau est nickel chaque semaine. Fiables.' },
      { auteur: 'Awa B.', initiales: 'AB', date: 'Mai 2025', note: 4, texte: 'Bonne qualité, parfois un peu lent sur les grandes surfaces.' },
    ],
  },

  // ══ INTERNET & TV ══
  {
    id: 'net-int-001', nom: 'Boureima Zongo', initiales: 'BZ',
    couleurAvatar: '#0369A1', metier: 'Internet & TV',
    specialite: 'Fibre optique · WiFi · DSTV · StarTimes',
    quartier: 'Kossodo — Sect. 25', whatsapp: '+226 70 99 00 11',
    note: 4.7, nombreAvis: 265, nombreInterventions: 380, estVerifie: true, disponible: true,
    anneesExperience: 7, description: 'Technicien agréé ONATEL & opérateurs privés. Installation fibre, configuration réseau WiFi mesh, décodeurs satellite.',
    pointsForts: ['Agréé ONATEL', 'WiFi mesh', 'Décodeurs satellite'],
    reputation: { travailBienFait: 94, bonPrix: 89, interventionRapide: 96, travailMalFait: 6, prixEleve: 11 },
    prestations: [
      { libelle: 'Installation fibre / ADSL', prixReference: 8000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Configuration WiFi + répéteurs', prixReference: 5000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Antenne DSTV / StarTimes', prixReference: 12000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Dépannage réseau (h)', prixReference: 3000, devise: 'FCFA', typeTarification: 'horaire' },
    ],
    avis: [
      { auteur: 'Ablassé W.', initiales: 'AW', date: 'Juil. 2025', note: 5, texte: 'Rapide, connaît bien son métier. WiFi parfait dans toute la maison.' },
      { auteur: 'Ines S.', initiales: 'IS', date: 'Juin 2025', note: 5, texte: 'Installation en moins d\'1h. Très propre dans son travail.' },
      { auteur: 'Théodore K.', initiales: 'TK', date: 'Avr. 2025', note: 4, texte: 'Compétent, petit peu cher pour la config WiFi mais qualité au RDV.' },
    ],
  },
  {
    id: 'net-int-002', nom: 'Issouf Kaboré', initiales: 'IK',
    couleurAvatar: '#065F46', metier: 'Internet & TV',
    specialite: 'Câblage réseau · Interphone · Domotique',
    quartier: 'Wemtenga — Sect. 22', whatsapp: '+226 76 12 34 56',
    note: 4.5, nombreAvis: 89, nombreInterventions: 130, estVerifie: false, disponible: true,
    anneesExperience: 4, description: 'Câblage structuré pour villas et bureaux. Interphones vidéo, contrôle d\'accès.',
    pointsForts: ['Câblage structuré villas/bureaux', 'Interphone vidéo'],
    reputation: { travailBienFait: 90, bonPrix: 88, interventionRapide: 85, travailMalFait: 10, prixEleve: 12 },
    prestations: [
      { libelle: 'Câblage réseau RJ45 (point)', prixReference: 3500, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Installation interphone vidéo', prixReference: 18000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Adama P.', initiales: 'AP', date: 'Juin 2025', note: 5, texte: 'Très bon travail sur le câblage de mon bureau. Propre et rapide.' },
      { auteur: 'Laure M.', initiales: 'LM', date: 'Mai 2025', note: 4, texte: 'Bon technicien, a dû repasser une fois mais a tout réglé.' },
    ],
  },

  // ══ LIVRAISON MEUBLES ══
  {
    id: 'liv-001', nom: 'Rasmané Sawadogo', initiales: 'RS',
    couleurAvatar: '#92400E', metier: 'Livraison meubles',
    specialite: 'Livraison & montage meubles · IKEA · Éden',
    quartier: 'Zone du Bois — Sect. 28', whatsapp: '+226 70 55 66 77',
    note: 4.7, nombreAvis: 178, nombreInterventions: 290, estVerifie: true, disponible: true,
    anneesExperience: 6, description: 'Livraison soigneuse + montage inclus si demandé. Camionnette bâchée disponible, 7j/7.',
    pointsForts: ['Montage inclus', 'Camionnette bâchée', 'Disponible 7j/7'],
    reputation: { travailBienFait: 93, bonPrix: 91, interventionRapide: 94, travailMalFait: 7, prixEleve: 9 },
    prestations: [
      { libelle: 'Livraison intra-muros', prixReference: 3000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Montage meuble (h)', prixReference: 2500, devise: 'FCFA', typeTarification: 'horaire' },
      { libelle: 'Pack livraison + montage', prixReference: 8000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Nora B.', initiales: 'NB', date: 'Juil. 2025', note: 5, texte: 'Livraison et montage en 2h. Très soigneux avec les meubles.' },
      { auteur: 'Drissa T.', initiales: 'DT', date: 'Juin 2025', note: 5, texte: 'Super service, même disponible le dimanche !' },
      { auteur: 'Alice K.', initiales: 'AK', date: 'Mai 2025', note: 4, texte: 'Bon travail, montage nickel, juste un peu de retard.' },
    ],
  },

  // ══ DÉCORATION ══
  {
    id: 'dec-001', nom: 'Aminata Diallo', initiales: 'AD',
    couleurAvatar: '#9D174D', metier: 'Décoration',
    specialite: 'Décoration intérieure · Aménagement · Staging',
    quartier: 'Patte d\'Oie — Sect. 10', whatsapp: '+226 71 22 33 44',
    note: 4.8, nombreAvis: 95, nombreInterventions: 128, estVerifie: true, disponible: true,
    anneesExperience: 9, description: 'Designer diplômée ESAM. Spécialisée intérieur africain moderne et staging immobilier. Devis gratuit.',
    pointsForts: ['Designer diplômée ESAM', 'Devis gratuit'],
    reputation: { travailBienFait: 95, bonPrix: 82, interventionRapide: 80, travailMalFait: 5, prixEleve: 18 },
    prestations: [
      { libelle: 'Conseil déco (2h)', prixReference: 15000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Aménagement pièce (forfait)', prixReference: 50000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Staging immobilier', prixReference: 80000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Yacine K.', initiales: 'YK', date: 'Juil. 2025', note: 5, texte: 'Mon salon est transformé ! Très créative et à l\'écoute.' },
      { auteur: 'François T.', initiales: 'FT', date: 'Juin 2025', note: 5, texte: 'Staging impeccable, l\'appartement s\'est loué en 3 jours.' },
    ],
  },
  {
    id: 'dec-002', nom: 'Sylvain Koné', initiales: 'SK',
    couleurAvatar: '#6D28D9', metier: 'Décoration',
    specialite: 'Rideaux · Tentures · Plafonds décoratifs',
    quartier: 'Dassasgho — Sect. 16', whatsapp: '+226 65 88 99 00',
    note: 4.5, nombreAvis: 67, nombreInterventions: 98, estVerifie: true, disponible: true,
    anneesExperience: 5, description: 'Pose de rideaux sur mesure, faux plafonds en staff et PVC, enduits décoratifs.',
    pointsForts: ['Rideaux sur mesure', 'Faux plafonds staff & PVC'],
    reputation: { travailBienFait: 89, bonPrix: 85, interventionRapide: 87, travailMalFait: 11, prixEleve: 15 },
    prestations: [
      { libelle: 'Rideaux (par fenêtre)', prixReference: 4000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Faux plafond (m²)', prixReference: 6000, devise: 'FCFA', typeTarification: 'au_m2' },
    ],
    avis: [
      { auteur: 'Bibata O.', initiales: 'BO', date: 'Juin 2025', note: 5, texte: 'Magnifique pose de rideaux. Délai respecté.' },
    ],
  },

  // ══ SÉCURITÉ & CAMÉRAS ══
  {
    id: 'sec-001', nom: 'Seydou Compaoré', initiales: 'SC',
    couleurAvatar: '#1E3A5F', metier: 'Sécurité & Caméras',
    specialite: 'Vidéosurveillance · Alarmes · Contrôle d\'accès',
    quartier: 'Ouaga 2000 — Sect. 53', whatsapp: '+226 70 66 77 88',
    note: 4.8, nombreAvis: 156, nombreInterventions: 220, estVerifie: true, disponible: true,
    anneesExperience: 11, description: 'Technicien certifié Hikvision & Dahua. Installation caméras IP, alarmes, portails automatiques, coffres-forts.',
    pointsForts: ['Certifié Hikvision & Dahua', 'Accès à distance sur téléphone'],
    reputation: { travailBienFait: 95, bonPrix: 88, interventionRapide: 93, travailMalFait: 5, prixEleve: 12 },
    prestations: [
      { libelle: 'Caméra intérieure (pose)', prixReference: 15000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Caméra extérieure (pose)', prixReference: 20000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Système alarme complet', prixReference: 80000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Maintenance annuelle', prixReference: 25000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Blaise N.', initiales: 'BN', date: 'Juil. 2025', note: 5, texte: '4 caméras installées proprement, accès sur téléphone configuré. Top !' },
      { auteur: 'Christine W.', initiales: 'CW', date: 'Juin 2025', note: 5, texte: 'Travail soigné, câbles bien dissimulés. Très professionnel.' },
      { auteur: 'Joseph S.', initiales: 'JS', date: 'Avr. 2025', note: 4, texte: 'Bonne installation, mais 2j de délai sur la livraison du matériel.' },
    ],
  },

  // ══ ÉLECTRICITÉ ══
  {
    id: 'ele-001', nom: 'Abdoulaye Nikiéma', initiales: 'AN',
    couleurAvatar: '#B45309', metier: 'Électricité',
    specialite: 'Électricité générale · Solaire · Onduleurs',
    quartier: 'Tampouy — Sect. 18', whatsapp: '+226 76 33 44 55',
    note: 4.8, nombreAvis: 312, nombreInterventions: 480, estVerifie: true, disponible: true,
    anneesExperience: 12, description: 'Électricien agréé SONABEL. Tableau électrique, installation solaire, onduleur, dépannage urgence 24h.',
    pointsForts: ['Agréé SONABEL', 'Dépannage urgence 24h', 'Installation solaire'],
    reputation: { travailBienFait: 95, bonPrix: 88, interventionRapide: 92, travailMalFait: 5, prixEleve: 12 },
    prestations: [
      { libelle: 'Dépannage (h)', prixReference: 3500, devise: 'FCFA', typeTarification: 'horaire' },
      { libelle: 'Installation prise / interrupteur', prixReference: 2500, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Tableau électrique complet', prixReference: 35000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Installation solaire (devis)', prixReference: 150000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Paul K.', initiales: 'PK', date: 'Juil. 2025', note: 5, texte: 'Réparation du tableau en urgence, en moins de 2h. Merci !' },
      { auteur: 'Sandrine O.', initiales: 'SO', date: 'Juin 2025', note: 5, texte: 'Installation solaire parfaite. Prix compétitif.' },
    ],
  },

  // ══ PLOMBERIE ══
  {
    id: 'plo-001', nom: 'Hamidou Sawadogo', initiales: 'HS',
    couleurAvatar: '#0F766E', metier: 'Plomberie',
    specialite: 'Plomberie sanitaire · Chauffe-eau · Fosse',
    quartier: 'Bogodogo — Sect. 35', whatsapp: '+226 71 55 66 77',
    note: 4.6, nombreAvis: 198, nombreInterventions: 350, estVerifie: true, disponible: true,
    anneesExperience: 9, description: 'Toutes interventions plomberie : fuite, robinetterie, chauffe-eau solaire, fosse septique. Intervention 24h/24.',
    pointsForts: ['Intervention 24h/24', 'Chauffe-eau solaire'],
    reputation: { travailBienFait: 92, bonPrix: 87, interventionRapide: 95, travailMalFait: 8, prixEleve: 13 },
    prestations: [
      { libelle: 'Réparation fuite (h)', prixReference: 3000, devise: 'FCFA', typeTarification: 'horaire' },
      { libelle: 'Installation robinet / WC', prixReference: 5000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Chauffe-eau solaire (pose)', prixReference: 25000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Moussa T.', initiales: 'MT', date: 'Juil. 2025', note: 5, texte: 'Fuite réparée en urgence à 22h. Vrai professionnel.' },
      { auteur: 'Clarisse B.', initiales: 'CB', date: 'Juin 2025', note: 4, texte: 'Bon travail, tarif honnête, légèrement cher le soir.' },
    ],
  },

  // ══ MAÇONNERIE ══
  {
    id: 'mac-001', nom: 'Adama Ouédraogo', initiales: 'AO',
    couleurAvatar: '#4B5563', metier: 'Maçonnerie',
    specialite: 'Construction · Rénovation · Carrelage',
    quartier: 'Nongr-Massom', whatsapp: '+226 65 77 00 11',
    note: 4.5, nombreAvis: 145, nombreInterventions: 230, estVerifie: true, disponible: true,
    anneesExperience: 14, description: 'Chef maçon expérimenté. Extension, rénovation, carrelage, enduit, crépis.',
    pointsForts: ['Chef maçon, 14 ans d\'exp.', 'Carrelage & rénovation'],
    reputation: { travailBienFait: 90, bonPrix: 85, interventionRapide: 78, travailMalFait: 10, prixEleve: 15 },
    prestations: [
      { libelle: 'Carrelage (m²)', prixReference: 4000, devise: 'FCFA', typeTarification: 'au_m2' },
      { libelle: 'Rénovation pièce (devis)', prixReference: 80000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Eric T.', initiales: 'ET', date: 'Juin 2025', note: 5, texte: 'Carrelage parfaitement posé, joints impeccables.' },
    ],
  },

  // ══ MENUISERIE ══
  {
    id: 'men-001', nom: 'Souleymane Diallo', initiales: 'SD',
    couleurAvatar: '#7C2D12', metier: 'Menuiserie',
    specialite: 'Menuiserie bois · Portes · Placards sur mesure',
    quartier: 'Dapoya — Sect. 4', whatsapp: '+226 70 22 33 44',
    note: 4.7, nombreAvis: 122, nombreInterventions: 195, estVerifie: true, disponible: false,
    anneesExperience: 15, description: 'Fabrication sur mesure : portes, fenêtres, placards, escaliers en bois massif et contreplaqué.',
    pointsForts: ['Fabrication sur mesure', 'Bois massif & contreplaqué'],
    reputation: { travailBienFait: 94, bonPrix: 83, interventionRapide: 75, travailMalFait: 6, prixEleve: 17 },
    prestations: [
      { libelle: 'Porte intérieure (pose)', prixReference: 15000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Placard sur mesure (m²)', prixReference: 35000, devise: 'FCFA', typeTarification: 'au_m2' },
    ],
    avis: [
      { auteur: 'Gaston K.', initiales: 'GK', date: 'Mai 2025', note: 5, texte: 'Placards magnifiques, finitions soignées. Délai tenu.' },
    ],
  },

  // ══ PEINTURE ══
  {
    id: 'pei-001', nom: 'Urbain Belem', initiales: 'UB',
    couleurAvatar: '#5B21B6', metier: 'Peinture',
    specialite: 'Peinture intérieure · Ravalement · Enduit',
    quartier: 'Cissin — Sect. 21', whatsapp: '+226 76 44 55 00',
    note: 4.6, nombreAvis: 188, nombreInterventions: 310, estVerifie: true, disponible: true,
    anneesExperience: 8, description: 'Peintre qualifié. Peinture décorative, enduit lissé, ravalement de façade. Délai et propreté garantis.',
    pointsForts: ['Enduit lissé & ravalement', 'Délai et propreté garantis'],
    reputation: { travailBienFait: 91, bonPrix: 88, interventionRapide: 84, travailMalFait: 9, prixEleve: 12 },
    prestations: [
      { libelle: 'Peinture intérieure (m²)', prixReference: 1500, devise: 'FCFA', typeTarification: 'au_m2' },
      { libelle: 'Ravalement façade (m²)', prixReference: 2500, devise: 'FCFA', typeTarification: 'au_m2' },
    ],
    avis: [
      { auteur: 'Martine B.', initiales: 'MB', date: 'Juil. 2025', note: 5, texte: 'Peinture nette, finitions parfaites. Très propre sur le chantier.' },
      { auteur: 'Louis N.', initiales: 'LN', date: 'Juin 2025', note: 4, texte: 'Bon travail, finitions légèrement imparfaites sur un coin.' },
    ],
  },

  // ══ CLIMATISATION ══
  {
    id: 'cli-001', nom: 'Théodore Ouattara', initiales: 'TO',
    couleurAvatar: '#0E7490', metier: 'Climatisation',
    specialite: 'Clim · Ventilation · Chambre froide',
    quartier: 'Zone Industrielle — Sect. 26', whatsapp: '+226 71 88 99 00',
    note: 4.7, nombreAvis: 204, nombreInterventions: 330, estVerifie: true, disponible: true,
    anneesExperience: 10, description: 'Technicien certifié Daikin, Toshiba, LG. Installation, maintenance, recharge gaz, dépannage.',
    pointsForts: ['Certifié Daikin, Toshiba, LG', 'Recharge gaz sur place'],
    reputation: { travailBienFait: 93, bonPrix: 86, interventionRapide: 90, travailMalFait: 7, prixEleve: 14 },
    prestations: [
      { libelle: 'Installation split 1HP', prixReference: 25000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Maintenance (nettoyage + gaz)', prixReference: 12000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Dépannage (h)', prixReference: 4000, devise: 'FCFA', typeTarification: 'horaire' },
    ],
    avis: [
      { auteur: 'Bernard Z.', initiales: 'BZ', date: 'Juil. 2025', note: 5, texte: 'Clim installée en 3h, câbles proprement dissimulés. Excellent.' },
      { auteur: 'Cécile W.', initiales: 'CW', date: 'Juin 2025', note: 5, texte: 'Recharge gaz faite rapidement. Prix honnête.' },
    ],
  },

  // ══ JARDINAGE ══
  {
    id: 'jar-001', nom: 'Noufou Tapsoba', initiales: 'NT',
    couleurAvatar: '#15803D', metier: 'Jardinage',
    specialite: 'Jardinage · Arrosage automatique · Gazon',
    quartier: 'Ouaga 2000 — Sect. 53', whatsapp: '+226 65 11 22 33',
    note: 4.5, nombreAvis: 78, nombreInterventions: 115, estVerifie: false, disponible: true,
    anneesExperience: 6, description: 'Entretien jardins et espaces verts, taille, gazon, arrosage automatique, massifs fleuris.',
    pointsForts: ['Arrosage automatique', 'Entretien massifs fleuris'],
    reputation: { travailBienFait: 90, bonPrix: 88, interventionRapide: 82, travailMalFait: 10, prixEleve: 12 },
    prestations: [
      { libelle: 'Entretien jardin (h)', prixReference: 2000, devise: 'FCFA', typeTarification: 'horaire' },
      { libelle: 'Arrosage automatique (forfait)', prixReference: 40000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Isabelle K.', initiales: 'IK', date: 'Juin 2025', note: 5, texte: 'Jardin magnifique depuis qu\'il en prend soin. Sérieux.' },
    ],
  },

  // ══ GARDIENNAGE ══
  {
    id: 'gar-001', nom: 'Boukary Somé', initiales: 'BS',
    couleurAvatar: '#374151', metier: 'Gardiennage',
    specialite: 'Gardiennage résidentiel & commercial',
    quartier: 'Pissy — Sect. 14', whatsapp: '+226 70 77 88 99',
    note: 4.6, nombreAvis: 112, nombreInterventions: 180, estVerifie: true, disponible: true,
    anneesExperience: 8, description: 'Agent de sécurité agréé. Gardiennage de nuit, surveillance villa & chantier. Disponible en remplacement.',
    pointsForts: ['Agent de sécurité agréé', 'Garde de nuit', 'Remplacement disponible'],
    reputation: { travailBienFait: 92, bonPrix: 88, interventionRapide: 86, travailMalFait: 8, prixEleve: 12 },
    prestations: [
      { libelle: 'Garde de nuit (12h)', prixReference: 8000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Surveillance 24h/24 (mensuel)', prixReference: 120000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Robert D.', initiales: 'RD', date: 'Juil. 2025', note: 5, texte: 'Ponctuel et discret. Je dors tranquille depuis qu\'il garde la villa.' },
    ],
  },

  // ══ SERVICES URGENTS (dépannage prioritaire — Ouagadougou) ══
  {
    id: 'vid-001', nom: 'Salif Ouédraogo', initiales: 'SO',
    couleurAvatar: '#6D4C1B', metier: 'Vidange fosse & WC',
    specialite: 'Vidange de fosse septique & latrines par camion',
    quartier: 'Tanghin', ville: 'Ouagadougou', latitude: 12.4001, longitude: -1.505,
    whatsapp: '+226 70 55 12 09',
    note: 4.7, nombreAvis: 58, nombreInterventions: 240, estVerifie: true, disponible: true,
    anneesExperience: 11,
    description: 'Camion vidangeur agréé, intervention rapide jour et nuit pour fosses septiques pleines, WC et douches qui débordent. Évacuation vers site autorisé.',
    pointsForts: ['Camion agréé', 'Intervention 24h/24', 'Évacuation autorisée'],
    reputation: { travailBienFait: 93, bonPrix: 84, interventionRapide: 95, travailMalFait: 7, prixEleve: 15 },
    prestations: [
      { libelle: 'Vidange fosse septique (camion 1 cuve)', prixReference: 30000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Débouchage WC/douche bouchés', prixReference: 8000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Adama S.', initiales: 'AS', date: 'Juin 2025', note: 5, texte: 'Fosse pleine un dimanche soir, il est venu en 1h. Sauvé !' },
    ],
  },
  {
    id: 'deb-001', nom: 'Rasmané Kaboré', initiales: 'RK',
    couleurAvatar: '#0E7490', metier: 'Débouchage canalisation',
    specialite: 'Débouchage WC, douche, évier & canalisations',
    quartier: 'Gounghin', ville: 'Ouagadougou', latitude: 12.3605, longitude: -1.54,
    whatsapp: '+226 76 34 22 88',
    note: 4.6, nombreAvis: 44, nombreInterventions: 160, estVerifie: true, disponible: true,
    anneesExperience: 7,
    description: 'Débouchage haute pression et furet pour WC, douches, éviers et canalisations bouchées. Diagnostic gratuit avant intervention.',
    pointsForts: ['Furet haute pression', 'Diagnostic gratuit', 'Intervention rapide'],
    reputation: { travailBienFait: 91, bonPrix: 89, interventionRapide: 92, travailMalFait: 9, prixEleve: 10 },
    prestations: [
      { libelle: 'Débouchage WC / douche', prixReference: 6000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Débouchage canalisation principale', prixReference: 12000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Fatou N.', initiales: 'FN', date: 'Mai 2025', note: 5, texte: 'Douche débouchée en 30 min, propre et efficace.' },
    ],
  },
  {
    id: 'ser-001', nom: 'Idrissa Congo', initiales: 'IC',
    couleurAvatar: '#7C2D12', metier: 'Serrurerie',
    specialite: 'Ouverture de porte & changement de serrure',
    quartier: 'Zogona', ville: 'Ouagadougou', latitude: 12.3721, longitude: -1.4975,
    whatsapp: '+226 70 88 44 21',
    note: 4.8, nombreAvis: 37, nombreInterventions: 120, estVerifie: true, disponible: true,
    anneesExperience: 9,
    description: 'Ouverture de porte claquée sans dégât, changement et blindage de serrure, double de clés. Intervention express en cas de blocage.',
    pointsForts: ['Ouverture sans dégât', 'Intervention express', 'Double de clés'],
    reputation: { travailBienFait: 94, bonPrix: 87, interventionRapide: 96, travailMalFait: 6, prixEleve: 12 },
    prestations: [
      { libelle: 'Ouverture de porte claquée', prixReference: 5000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Changement de serrure', prixReference: 12000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Bintou Traoré', initiales: 'BT', date: 'Juin 2025', note: 5, texte: 'Enfermée dehors la nuit, ouverture rapide sans casser la porte.' },
    ],
  },
  {
    id: 'gel-001', nom: 'Moussa Nikièma', initiales: 'MN',
    couleurAvatar: '#B45309', metier: 'Groupe électrogène',
    specialite: 'Dépannage groupe électrogène & onduleur',
    quartier: 'Ouaga 2000', ville: 'Ouagadougou', latitude: 12.3448, longitude: -1.4565,
    whatsapp: '+226 76 12 90 34',
    note: 4.7, nombreAvis: 29, nombreInterventions: 98, estVerifie: true, disponible: true,
    anneesExperience: 10,
    description: 'Réparation et entretien de groupes électrogènes et onduleurs, indispensable pendant les coupures SONABEL. Pièces disponibles.',
    pointsForts: ['Spécial coupures SONABEL', 'Pièces disponibles', 'Entretien préventif'],
    reputation: { travailBienFait: 92, bonPrix: 85, interventionRapide: 90, travailMalFait: 8, prixEleve: 14 },
    prestations: [
      { libelle: 'Diagnostic + dépannage groupe', prixReference: 7500, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Entretien complet (vidange, filtres)', prixReference: 12000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Ousmane D.', initiales: 'OD', date: 'Juil. 2025', note: 5, texte: 'Groupe réparé le jour même, en pleine coupure. Parfait.' },
    ],
  },
  {
    id: 'for-001', nom: 'Boukary Sana', initiales: 'BS',
    couleurAvatar: '#155E75', metier: 'Forage & pompe à eau',
    specialite: 'Réparation pompe immergée & château d\'eau',
    quartier: 'Karpala', ville: 'Ouagadougou', latitude: 12.339, longitude: -1.47,
    whatsapp: '+226 70 45 67 12',
    note: 4.6, nombreAvis: 22, nombreInterventions: 74, estVerifie: true, disponible: true,
    anneesExperience: 12,
    description: 'Réparation de pompes immergées, surpresseurs et châteaux d\'eau. Rétablissement de l\'eau courante en cas de panne de pompe.',
    pointsForts: ['Pompe immergée & surpresseur', 'Rétablissement eau rapide', 'Devis avant travaux'],
    reputation: { travailBienFait: 90, bonPrix: 83, interventionRapide: 88, travailMalFait: 10, prixEleve: 16 },
    prestations: [
      { libelle: 'Diagnostic + dépannage pompe', prixReference: 15000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Remplacement surpresseur', prixReference: 25000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Mariam Z.', initiales: 'MZ', date: 'Mai 2025', note: 4, texte: 'Eau rétablie dans la journée, travail sérieux.' },
    ],
  },
  {
    id: 'der-001', nom: 'Aline Kaboré', initiales: 'AK',
    couleurAvatar: '#4D7C0F', metier: 'Dératisation & désinsectisation',
    specialite: 'Traitement rats, cafards, moustiques & punaises',
    quartier: 'Wemtenga', ville: 'Ouagadougou', latitude: 12.377, longitude: -1.48,
    whatsapp: '+226 76 90 12 55',
    note: 4.7, nombreAvis: 31, nombreInterventions: 110, estVerifie: true, disponible: true,
    anneesExperience: 6,
    description: 'Traitement anti-nuisibles (rats, cafards, moustiques, punaises de lit) avec produits homologués sans danger pour la famille.',
    pointsForts: ['Produits homologués', 'Sans danger famille', 'Suivi après traitement'],
    reputation: { travailBienFait: 93, bonPrix: 90, interventionRapide: 87, travailMalFait: 7, prixEleve: 9 },
    prestations: [
      { libelle: 'Traitement studio / 1 chambre', prixReference: 7000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Traitement villa complète', prixReference: 18000, devise: 'FCFA', typeTarification: 'forfait' },
    ],
    avis: [
      { auteur: 'Paul O.', initiales: 'PO', date: 'Juin 2025', note: 5, texte: 'Plus un seul cafard depuis le traitement. Efficace.' },
    ],
  },
  {
    id: 'sou-001', nom: 'Hamado Zabsonré', initiales: 'HZ',
    couleurAvatar: '#57534E', metier: 'Soudure & ferronnerie',
    specialite: 'Réparation portail, grille & serrurerie métallique',
    quartier: 'Patte d\'Oie', ville: 'Ouagadougou', latitude: 12.348, longitude: -1.52,
    whatsapp: '+226 70 23 45 78',
    note: 4.5, nombreAvis: 26, nombreInterventions: 88, estVerifie: true, disponible: true,
    anneesExperience: 14,
    description: 'Soudure et réparation de portails, grilles, portes métalliques et protections de fenêtres. Renforcement sécurité sur mesure.',
    pointsForts: ['Portail & grille', 'Renfort sécurité', 'Travail sur place'],
    reputation: { travailBienFait: 89, bonPrix: 86, interventionRapide: 84, travailMalFait: 11, prixEleve: 13 },
    prestations: [
      { libelle: 'Réparation portail / grille', prixReference: 10000, devise: 'FCFA', typeTarification: 'forfait' },
      { libelle: 'Pose protection fenêtre (au m²)', prixReference: 9000, devise: 'FCFA', typeTarification: 'au_m2' },
    ],
    avis: [
      { auteur: 'Céline B.', initiales: 'CB', date: 'Avr. 2025', note: 4, texte: 'Portail réparé et renforcé, je me sens plus en sécurité.' },
    ],
  },
  ];

  readonly artisansFiltres = signal<Artisan[]>(this.artisansMock);

  /** Demandes de mise en relation reçues par l'artisan connecté (mock local, espace artisan). */
  private readonly demandesMock: DemandeArtisanRecue[] = [
    {
      id: 'dem-001',
      artisanId: 'art-001',
      nomClient: 'Fatimata O.',
      besoin: 'Prise électrique qui grésille dans le salon',
      positionLibelle: 'Ouaga 2000, secteur 15',
      date: 'Il y a 2 heures',
      statut: 'en_attente',
    },
    {
      id: 'dem-002',
      artisanId: 'art-001',
      nomClient: 'Karim T.',
      besoin: 'Installation compteur individuel avant emménagement',
      positionLibelle: 'Ouaga 2000, secteur 12',
      date: 'Hier',
      statut: 'en_attente',
    },
    {
      id: 'dem-003',
      artisanId: 'art-001',
      nomClient: 'Aïcha K.',
      besoin: 'Panne de courant intermittente',
      positionLibelle: 'Kalgondin',
      date: 'Il y a 3 jours',
      statut: 'traitee',
    },
  ];

  readonly demandesRecues = signal<DemandeArtisanRecue[]>(this.demandesMock);

  /** Retrouve un artisan à partir de son id (utilisé par l'espace artisan connecté). */
  obtenirArtisanParId(id: string): Artisan | undefined {
    return this.artisansMock.find((a) => a.id === id);
  }

  /**
   * Retrouve un artisan à partir de son nom (slugifié), pour relier le compte
   * connecté (AuthService, prénom + nom) au profil artisan correspondant.
   */
  obtenirArtisanParNom(nomComplet: string): Artisan | undefined {
    return this.artisansMock.find((a) => slugifier(a.nom) === slugifier(nomComplet));
  }

  /** Demandes reçues pour un artisan donné, les plus récentes en premier. */
  demandesPourArtisan(artisanId: string): DemandeArtisanRecue[] {
    return this.demandesRecues().filter((d: DemandeArtisanRecue) => d.artisanId === artisanId);
  }

  /** Bascule la disponibilité de l'artisan (mock local — pas encore persisté côté API). */
  basculerDisponibilite(artisanId: string): void {
    const artisan = this.artisansMock.find((a) => a.id === artisanId);
    if (artisan) artisan.disponible = !artisan.disponible;
    this.artisansFiltres.set([...this.artisansMock]);
  }

  /**
   * Met à jour les informations de profil modifiables par l'artisan connecté
   * (identité, métier, spécialité, description, points forts, localisation,
   * contact WhatsApp, avatar). Les champs calculés (note, avis, réputation,
   * nombre d'interventions) et le statut de vérification restent gérés par KaSa.
   * C'est cette mise à jour qui garantit que le profil rempli par l'artisan
   * correspond exactement à ce qui est affiché dans la liste et le détail.
   */
  mettreAJourProfil(artisanId: string, profil: Partial<ProfilArtisanModifiable>): Artisan | undefined {
    const artisan = this.artisansMock.find((a) => a.id === artisanId);
    if (!artisan) return undefined;
    Object.assign(artisan, profil);
    if (profil.nom) {
      artisan.initiales = profil.nom
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((mot) => mot[0]?.toUpperCase() ?? '')
        .join('');
    }
    this.artisansFiltres.set([...this.artisansMock]);
    return artisan;
  }

  /** Ajoute une nouvelle prestation au catalogue de l'artisan (mock local). */
  ajouterPrestation(artisanId: string, prestation: Prestation): void {
    const artisan = this.artisansMock.find((a) => a.id === artisanId);
    if (artisan) artisan.prestations = [...artisan.prestations, prestation];
    this.artisansFiltres.set([...this.artisansMock]);
  }

  /** Supprime une prestation du catalogue de l'artisan (mock local). */
  supprimerPrestation(artisanId: string, index: number): void {
    const artisan = this.artisansMock.find((a) => a.id === artisanId);
    if (artisan) artisan.prestations = artisan.prestations.filter((_, i) => i !== index);
    this.artisansFiltres.set([...this.artisansMock]);
  }

  /** Marque une demande reçue comme traitée. */
  marquerDemandeTraitee(demandeId: string): void {
    this.demandesRecues.update((liste: DemandeArtisanRecue[]) =>
      liste.map((d: DemandeArtisanRecue) => (d.id === demandeId ? { ...d, statut: 'traitee' as const } : d)),
    );
  }

  obtenirArtisans(filtres: FiltresArtisan = {}): Artisan[] {
    return this.artisansMock.filter((a) => {
      if (filtres.metier && a.metier !== filtres.metier) return false;
      if (filtres.quartier && a.quartier !== filtres.quartier) return false;
      if (filtres.disponibleUniquement && !a.disponible) return false;
      return true;
    });
  }

  appliquerFiltres(filtres: FiltresArtisan): void {
    this.artisansFiltres.set(this.obtenirArtisans(filtres));
  }

  /** Construit le message pré-rempli transmis à WhatsApp lors de la mise en relation */
  construireLienWhatsapp(artisan: Artisan, besoin: string, position: string): string {
    const numero = artisan.whatsapp.replace(/[^0-9]/g, '');
    const texte = encodeURIComponent(
      `Bonjour ${artisan.nom}, besoin d'un(e) ${artisan.metier.toLowerCase()} : ${besoin}. Position : ${position}.`,
    );
    return `https://wa.me/${numero}?text=${texte}`;
  }
}
