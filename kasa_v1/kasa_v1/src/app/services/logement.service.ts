import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  DonneesLogementFormulaire,
  FiltresLogement,
  Hote,
  Logement,
  Signalement,
  TypeSignalement,
} from '../models/logement.model';
import { ChangementTerrain, EspaceGerant, ProfilPersonne } from '../models/profil.model';
import { slugifier } from '../utils/slug';
import { API_BASE_URL, USE_BACKEND } from '../config/api.config';
import {
  PaginatedDTO,
  PropertyDetailDTO,
  PropertyListDTO,
  mapPropertyDetailToLogement,
  mapPropertyListToLogement,
} from './logement-api.adapter';

/**
 * Service de données pour les logements KaSa.
 *
 * Architecture viewport-aware :
 * - obtenirLogements(filtres) : charge uniquement les logements dans le bbox visible
 * - obtenirLogementParId(id)  : charge le détail d'un logement
 *
 * Quand l'API sera prête, remplacer `of(this.logementsMock)` par `this.http.get<Logement[]>(url, { params })`
 * Les composants n'ont rien à changer — le contrat public ne change pas.
 */
@Injectable({ providedIn: 'root' })
export class LogementService {
  readonly centreOuagadougou = { latitude: 12.3714, longitude: -1.5197 };

  private readonly http = inject(HttpClient);
  private readonly urlLogements = `${API_BASE_URL}/properties/logements/`;

  // ── Seed data (remplacer par http.get quand l'API est prête) ──────────────
  private readonly logementsMock: Logement[] = [
    {
      id: 'log-001',
      titre: 'KaSa',
      quartier: 'Ouaga 2000',
      ville: 'Ouagadougou',
      typeBien: 'Mini villa',
      typeLocation: 'Famille',
      prix: 1000000,
      devise: 'FCFA',
      commissionKasa: 5000,
      distanceKm: 0.35,
      nombreChambres: 4,
      description: 'Magnifique villa haut standing à Ouaga 2000, Cité Azimo.',
      equipements: ['Parking', 'Compteur SONABEL', "Compteur d'eau", 'Grande cour'],
      images: [
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200',
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
      ],
      videoDureeSecondes: 96,
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      hote: {
        nom: 'Saidou Compaoré',
        initiales: 'SC',
        estVerifie: true,
        note: 4.8,
        nombreAvis: 23,
        niveauConfiance: 5,
        membreDepuis: '2022',
        nombreAnnonces: 3,
      },
      publieDepuis: 'il y a 2 h',
      estActif: true,
      dateCreation: '2026-06-12T08:30:00Z',
      nombreVisites: 124,
      latitude: 12.3447,
      longitude: -1.4569,
      adresse: 'Cité Azimo, Ouaga 2000',
      conditionsLocation: 'Caution 2 mois + avance 3 mois',
      gpsVerifie: true,
      annonceCertifiee: true,
      surface: { valeurM2: 180, detail: 'Surface habitable + cour' },
      infoEau: {
        disponibilite: 'oui',
        typeCompteur: 'individuel',
        frequenceCoupures: 'rarement',
        derniereFactureUrl:
          'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200',
        derniereFactureStatut: 'Payée',
        dernierePaiementDate: '2026-07-03',
      },
      infoElectricite: {
        disponibilite: 'oui',
        typeCompteur: 'individuel',
        estCashPower: false,
        frequenceCoupures: 'rarement',
        derniereFactureUrl:
          'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200',
        derniereFactureStatut: 'Payée',
        derniereFactureDate: '2026-07-05',
      },
      historiquePrix: [
        { date: '2026-06-12', prix: 1000000, devise: 'FCFA', motif: 'Publication' },
        { date: '2026-05-28', prix: 1050000, devise: 'FCFA', motif: 'Révision à la baisse' },
      ],
      scoreConfiance: 9.4,
      verifications: [
        { libelle: "Visite physique effectuée par l'agent", detail: '28 mai 2026', validee: true },
        { libelle: 'GPS exact vérifié', detail: 'Vérifié', validee: true },
      ],
      avis: [
        {
          initiales: 'MB',
          auteur: 'Moussa B.',
          date: 'Mai 2026',
          note: 5,
          commentaire: 'Agent très professionnel.',
        },
      ],
      repartitionNotes: { 5: 39, 4: 6, 3: 2, 2: 0, 1: 0 },
      cautionAlternative: { disponible: true, cotisationMensuelle: 25000, moisCautionEvites: 2 },
    },
    {
      id: 'log-002',
      quartier: 'Kalgondin',
      ville: 'Ouagadougou',
      typeBien: 'Studio',
      typeLocation: 'Célibat',
      prix: 40000,
      devise: 'FCFA',
      commissionKasa: 10000,
      distanceKm: 0.68,
      nombreChambres: 1,
      description: '1 chambre. Salon. Cuisine. Douche et WC interne.',
      equipements: ['Salon', 'Cuisine', 'Douche interne'],
      images: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'],
      hote: {
        nom: 'Fatimata Kaboré',
        initiales: 'FK',
        estVerifie: true,
        note: 4.7,
        nombreAvis: 28,
        statut: 'represente_par_agent',
        langueParlee: 'Mooré',
        contactUniquementViaAgent: true,
      },
      noteAgent: {
        qualiteAccompagnement: 4.8,
        ponctualite: 4.6,
        exactitudeInfos: 4.9,
        comportementProfessionnel: 4.7,
        nombreVisites: 52,
        moyenne: 4.7,
        nomAgent: 'Boureima Sawadogo',
        initialesAgent: 'BS',
      },
      publieDepuis: 'il y a 2 h',
      estActif: true,
      dateCreation: '2026-06-20T10:00:00Z',
      nombreVisites: 38,
      latitude: 12.3801,
      longitude: -1.4978,
      annonceCertifiee: true,
      surface: { valeurM2: 32 },
      infoEau: { disponibilite: 'oui', typeCompteur: 'partage', frequenceCoupures: 'parfois' },
      infoElectricite: {
        disponibilite: 'oui',
        typeCompteur: 'individuel',
        estCashPower: true,
        montantRedevancesMensuels: 4500,
      },
      historiquePrix: [
        { date: '2026-06-01', prix: 37000, devise: 'FCFA', motif: 'Publication' },
        {
          date: '2026-06-20',
          prix: 40000,
          devise: 'FCFA',
          motif: "Ajustement suite à travaux de rafraîchissement (remonté par l'agent)",
        },
      ],
      signalements: [
        {
          type: 'absence_eau',
          date: '2026-07-05',
          description: "Coupure ONEA de 2 jours signalée par l'agent, résolue depuis",
          statut: 'resolu',
        },
      ],
      avis: [
        {
          initiales: 'RN',
          auteur: 'Rasmané N.',
          date: 'Juillet 2026',
          note: 5,
          commentaire:
            "Boureima était à l'heure et très clair sur les conditions, aucune mauvaise surprise.",
        },
        {
          initiales: 'HK',
          auteur: 'Hadiza K.',
          date: 'Juin 2026',
          note: 4,
          commentaire:
            "Bon accompagnement, l'agent a bien expliqué la situation du bailleur absent.",
        },
      ],
    },
    {
      id: 'log-003',
      quartier: 'Tanghin',
      ville: 'Ouagadougou',
      typeBien: 'Magasin',
      typeLocation: 'Célibat',
      prix: 75000,
      devise: 'FCFA',
      commissionKasa: 18750,
      distanceKm: 1.2,
      nombreChambres: 0,
      description: 'Local commercial avec vitrine sur rue passante.',
      equipements: ['Vitrine', 'Rideau métallique'],
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'],
      hote: {
        nom: 'Issouf Ouédraogo',
        initiales: 'IO',
        estVerifie: true,
        note: 4.4,
        nombreAvis: 9,
        statut: 'non_verifie',
      },
      publieDepuis: 'il y a 5 h',
      estActif: true,
      dateCreation: '2026-06-22T06:00:00Z',
      nombreVisites: 17,
      latitude: 12.3905,
      longitude: -1.5012,
      infoEau: { disponibilite: 'non', typeCompteur: 'partage' },
      infoElectricite: {
        disponibilite: 'oui',
        typeCompteur: 'individuel',
        estCashPower: true,
        montantRedevancesMensuels: 6000,
      },
      historiquePrix: [{ date: '2026-06-22', prix: 75000, devise: 'FCFA', motif: 'Publication' }],
    },
    {
      id: 'log-004',
      quartier: 'Wemtenga',
      ville: 'Ouagadougou',
      typeBien: 'Mini villa',
      typeLocation: 'Famille',
      prix: 250000,
      devise: 'FCFA',
      commissionKasa: 62500,
      distanceKm: 2.1,
      nombreChambres: 3,
      description: 'Mini villa avec piscine, terrasse et jardin clos.',
      equipements: ['Piscine', 'Terrasse', 'Garage'],
      images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
      hote: { nom: 'Aïcha Compaoré', initiales: 'AC', estVerifie: true, note: 4.9, nombreAvis: 41 },
      publieDepuis: 'il y a 1 jour',
      estActif: true,
      dateCreation: '2026-06-21T09:00:00Z',
      nombreVisites: 56,
      latitude: 12.3552,
      longitude: -1.5421,
      annonceCertifiee: true,
      surface: { valeurM2: 120 },
      infoEau: { disponibilite: 'oui', typeCompteur: 'individuel', frequenceCoupures: 'jamais' },
      infoElectricite: {
        disponibilite: 'oui',
        typeCompteur: 'individuel',
        estCashPower: false,
        frequenceCoupures: 'jamais',
      },
      historiquePrix: [{ date: '2026-06-21', prix: 250000, devise: 'FCFA', motif: 'Publication' }],
    },
    {
      id: 'log-005',
      quartier: 'Gounghin',
      ville: 'Ouagadougou',
      typeBien: 'Chambre',
      typeLocation: 'Colocation',
      prix: 22000,
      devise: 'FCFA',
      commissionKasa: 5500,
      distanceKm: 1.8,
      nombreChambres: 1,
      description: 'Chambre dans une cour commune, douche partagée.',
      equipements: ['Douche partagée', 'Cour commune'],
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
      hote: { nom: 'Boukary Zongo', initiales: 'BZ', estVerifie: false, note: 4.1, nombreAvis: 6 },
      publieDepuis: 'il y a 3 h',
      estActif: true,
      dateCreation: '2026-06-22T07:15:00Z',
      nombreVisites: 9,
      latitude: 12.3669,
      longitude: -1.5489,
      infoEau: {
        disponibilite: 'intermittent',
        typeCompteur: 'partage',
        frequenceCoupures: 'souvent',
      },
      infoElectricite: {
        disponibilite: 'oui',
        typeCompteur: 'partage',
        estCashPower: true,
        montantRedevancesMensuels: 2000,
      },
      historiquePrix: [{ date: '2026-06-22', prix: 22000, devise: 'FCFA', motif: 'Publication' }],
    },
    {
      id: 'log-006',
      quartier: 'Pissy',
      ville: 'Ouagadougou',
      typeBien: 'Appartement',
      typeLocation: 'Famille',
      prix: 120000,
      devise: 'FCFA',
      commissionKasa: 30000,
      distanceKm: 3.4,
      nombreChambres: 2,
      description: 'Appartement 2 chambres, salon, balcon.',
      equipements: ['Balcon', '2 chambres', 'Cuisine équipée'],
      images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
      hote: { nom: 'Salif Traoré', initiales: 'ST', estVerifie: true, note: 4.5, nombreAvis: 19 },
      publieDepuis: 'il y a 6 h',
      estActif: true,
      dateCreation: '2026-06-22T04:00:00Z',
      nombreVisites: 22,
      latitude: 12.3608,
      longitude: -1.5689,
      surface: { valeurM2: 65 },
      infoEau: { disponibilite: 'oui', typeCompteur: 'individuel', frequenceCoupures: 'rarement' },
      infoElectricite: {
        disponibilite: 'oui',
        typeCompteur: 'individuel',
        estCashPower: false,
        frequenceCoupures: 'rarement',
      },
      historiquePrix: [
        { date: '2026-06-22', prix: 120000, devise: 'FCFA', motif: 'Publication' },
        { date: '2026-06-10', prix: 130000, devise: 'FCFA', motif: 'Révision' },
      ],
    },
    {
      id: 'log-007',
      quartier: 'Dassasgho',
      ville: 'Ouagadougou',
      typeBien: 'Studio',
      typeLocation: 'Célibat',
      prix: 35000,
      devise: 'FCFA',
      commissionKasa: 8750,
      distanceKm: 1.5,
      nombreChambres: 1,
      description: 'Studio meublé, proche des grands axes.',
      equipements: ['Meublé', 'Douche interne'],
      images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
      hote: { nom: 'Mariam Sanou', initiales: 'MS', estVerifie: true, note: 4.3, nombreAvis: 11 },
      publieDepuis: 'il y a 1 jour',
      estActif: true,
      dateCreation: '2026-06-21T11:00:00Z',
      nombreVisites: 14,
      latitude: 12.3789,
      longitude: -1.5012,
      infoEau: { disponibilite: 'oui', typeCompteur: 'partage', frequenceCoupures: 'parfois' },
      infoElectricite: {
        disponibilite: 'oui',
        typeCompteur: 'individuel',
        estCashPower: true,
        montantRedevancesMensuels: 3000,
      },
      historiquePrix: [{ date: '2026-06-21', prix: 35000, devise: 'FCFA', motif: 'Publication' }],
    },
    {
      id: 'log-008',
      quartier: 'Zogona',
      ville: 'Ouagadougou',
      typeBien: 'Villa',
      typeLocation: 'Famille',
      prix: 400000,
      devise: 'FCFA',
      commissionKasa: 100000,
      distanceKm: 2.9,
      nombreChambres: 4,
      description: 'Villa haut standing, 4 chambres, cour spacieuse.',
      equipements: ['4 chambres', 'Garage double', 'Groupe électrogène'],
      images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
      hote: { nom: 'Karim Diallo', initiales: 'KD', estVerifie: true, note: 4.8, nombreAvis: 33 },
      publieDepuis: 'il y a 4 h',
      estActif: true,
      dateCreation: '2026-06-22T05:00:00Z',
      nombreVisites: 41,
      latitude: 12.3411,
      longitude: -1.5301,
      annonceCertifiee: true,
      surface: { valeurM2: 220 },
      infoEau: { disponibilite: 'oui', typeCompteur: 'individuel', frequenceCoupures: 'jamais' },
      infoElectricite: {
        disponibilite: 'oui',
        typeCompteur: 'individuel',
        estCashPower: false,
        frequenceCoupures: 'rarement',
      },
      historiquePrix: [{ date: '2026-06-22', prix: 400000, devise: 'FCFA', motif: 'Publication' }],
    },
  ];

  // ── API publique ──────────────────────────────────────────────────────────

  /**
   * Retourne les logements correspondant aux filtres.
   *
   * IMPORTANT — Architecture viewport-aware :
   * Toujours passer `filtres.bornesCarte` depuis le composant parent
   * (mis à jour à chaque `moveend` de la carte) pour ne charger
   * que ce qui est visible à l'écran.
   *
   * Passage à l'API réelle :
   *   return this.http.get<Logement[]>('/api/logements', { params: this.toParams(filtres) });
   */
  obtenirLogements(filtres?: FiltresLogement): Observable<Logement[]> {
    if (!USE_BACKEND) {
      return of(this.logementsMock).pipe(
        map((logements) => this.appliquerFiltres(logements, filtres)),
      );
    }
    // API réelle : liste paginée Django → Logement[], avec repli mock si l'API échoue.
    return this.http.get<PaginatedDTO<PropertyListDTO>>(this.urlLogements).pipe(
      map((page) => page.results.map((dto, i) => mapPropertyListToLogement(dto, i))),
      map((logements) => this.appliquerFiltres(logements, filtres)),
      catchError(() =>
        of(this.appliquerFiltres(this.logementsMock, filtres)),
      ),
    );
  }

  obtenirLogementParId(id: string): Observable<Logement | undefined> {
    if (!USE_BACKEND) {
      return of(this.logementsMock.find((l) => l.id === id));
    }
    return this.http.get<PropertyDetailDTO>(`${this.urlLogements}${id}/`).pipe(
      map((dto) => mapPropertyDetailToLogement(dto)),
      catchError(() => of(this.logementsMock.find((l) => l.id === id))),
    );
  }

  /**
   * Liste triée des quartiers disponibles (noms distincts), pour alimenter
   * les filtres (ex. sélecteur de quartier du simulateur de budget).
   */
  obtenirQuartiers(): Observable<string[]> {
    return this.obtenirLogements().pipe(
      map((logements) =>
        [...new Set(logements.map((l) => l.quartier).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b, 'fr'),
        ),
      ),
    );
  }

  /**
   * Identifiant utilisé dans l'URL pour un bailleur / un agent, à partir de
   * son nom. Utilisé à la fois pour construire les liens (composants) et
   * pour retrouver le profil (ci-dessous).
   */
  idBailleur(nom: string): string {
    return slugifier(nom);
  }

  idAgent(nom: string): string {
    return slugifier(nom);
  }

  /**
   * Profil public d'un bailleur, agrégé à partir de toutes ses annonces.
   * Retourne `undefined` si aucune annonce ne correspond à cet id.
   */
  obtenirProfilBailleur(id: string): Observable<ProfilPersonne | undefined> {
    const logements = this.logementsMock.filter((l) => slugifier(l.hote.nom) === id);
    if (!logements.length) return of(undefined);

    const ref = logements[0];
    const avis = logements.flatMap((l) => l.avis ?? []);

    const profil: ProfilPersonne = {
      type: 'bailleur',
      id,
      nom: ref.hote.nom,
      initiales: ref.hote.initiales,
      photoUrl: ref.hote.photoUrl,
      estVerifie: ref.hote.estVerifie,
      membreDepuis: ref.hote.membreDepuis,
      niveauConfiance: ref.hote.niveauConfiance,
      statutBailleur: ref.hote.statut ?? 'autonome',
      langueParlee: ref.hote.langueParlee,
      noteMoyenne: ref.hote.note,
      nombreAvis: ref.hote.nombreAvis,
      nombreAnnonces: logements.length,
      criteres: ref.noteProprietaire
        ? [
            { label: 'Respect des conditions', valeur: ref.noteProprietaire.respectConditions },
            {
              label: 'Disponibilité du logement',
              valeur: ref.noteProprietaire.disponibiliteLogement,
            },
            { label: 'Honnêteté des informations', valeur: ref.noteProprietaire.honneteteInfos },
            { label: 'Réactivité', valeur: ref.noteProprietaire.reactivite },
          ]
        : [],
      logements,
      avis,
    };
    return of(profil);
  }

  /**
   * Profil public d'un agent terrain, agrégé à partir de toutes les
   * annonces qu'il a accompagnées / vérifiées.
   */
  obtenirProfilAgent(id: string): Observable<ProfilPersonne | undefined> {
    const logements = this.logementsMock.filter(
      (l) => l.noteAgent?.nomAgent && slugifier(l.noteAgent.nomAgent) === id,
    );
    if (!logements.length) return of(undefined);

    const ref = logements.find((l) => l.noteAgent)!;
    const na = ref.noteAgent!;
    const avis = logements.flatMap((l) => l.avis ?? []);

    const quartiersCouverts = [...new Set(logements.map((l) => l.quartier))];

    // Changements remontés depuis le terrain : variations de prix (hors publication
    // initiale) + signalements suivis par l'agent sur ses annonces.
    const changementsPrix: ChangementTerrain[] = logements.flatMap((l) =>
      (l.historiquePrix ?? [])
        .filter((h) => h.motif && h.motif !== 'Publication')
        .map((h) => ({
          date: h.date,
          type: 'Changement de prix',
          description: h.motif ?? `Nouveau prix : ${h.prix.toLocaleString('fr-FR')} ${h.devise}`,
          quartier: l.quartier,
          logementId: l.id,
        })),
    );
    const changementsSignales: ChangementTerrain[] = logements.flatMap((l) =>
      (l.signalements ?? []).map((s) => ({
        date: s.date,
        type: this.libelleTypeSignalement(s.type),
        description: s.description ?? this.libelleTypeSignalement(s.type),
        quartier: l.quartier,
        logementId: l.id,
      })),
    );
    const changementsTerrain = [...changementsPrix, ...changementsSignales].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const profil: ProfilPersonne = {
      type: 'agent',
      id,
      nom: na.nomAgent ?? '',
      initiales: na.initialesAgent ?? '',
      estVerifie: true,
      noteMoyenne: na.moyenne,
      nombreAvis: avis.length,
      nombreAnnonces: logements.length,
      nombreVisites: na.nombreVisites,
      nombreInterventions: na.nombreVisites + changementsTerrain.length,
      quartiersCouverts,
      changementsTerrain,
      criteres: [
        { label: "Qualité de l'accompagnement", valeur: na.qualiteAccompagnement },
        { label: 'Ponctualité', valeur: na.ponctualite },
        { label: 'Exactitude des informations', valeur: na.exactitudeInfos },
        { label: 'Comportement professionnel', valeur: na.comportementProfessionnel },
      ],
      logements,
      avis,
    };
    return of(profil);
  }

  /**
   * Tableau de bord privé du gérant connecté (route /gerant) : regroupe tous
   * les logements dont il est le bailleur ET/OU l'agent terrain rattaché
   * (un même compte gérant peut cumuler les deux casquettes). Contrairement
   * à `obtenirProfilAgent`/`obtenirProfilBailleur` (profils publics
   * consultés par un locataire), cette méthode ne filtre pas par un seul
   * rôle : elle sert la vue interne du gérant sur *tout* son portefeuille.
   */
  obtenirEspaceGerant(nomGerant: string): Observable<EspaceGerant | undefined> {
    const idRecherche = slugifier(nomGerant);
    const logements = this.logementsMock.filter(
      (l) =>
        slugifier(l.hote.nom) === idRecherche ||
        (l.noteAgent?.nomAgent && slugifier(l.noteAgent.nomAgent) === idRecherche),
    );
    if (!logements.length) return of(undefined);

    const quartiersCouverts = [...new Set(logements.map((l) => l.quartier))];
    const avisTotal = logements.reduce((acc, l) => acc + (l.avis?.length ?? 0), 0);

    const notesProprietaire = logements
      .filter((l) => slugifier(l.hote.nom) === idRecherche)
      .map((l) => l.hote.note);
    const notesAgent = logements
      .filter((l) => l.noteAgent && slugifier(l.noteAgent.nomAgent ?? '') === idRecherche)
      .map((l) => l.noteAgent!.moyenne);
    const toutesLesNotes = [...notesProprietaire, ...notesAgent];
    const noteMoyenne = toutesLesNotes.length
      ? Math.round((toutesLesNotes.reduce((a, b) => a + b, 0) / toutesLesNotes.length) * 10) / 10
      : 0;

    const nombreVisites = logements.reduce((acc, l) => acc + (l.noteAgent?.nombreVisites ?? 0), 0);

    const changementsPrix: ChangementTerrain[] = logements.flatMap((l) =>
      (l.historiquePrix ?? [])
        .filter((h) => h.motif && h.motif !== 'Publication')
        .map((h) => ({
          date: h.date,
          type: 'Changement de prix',
          description: h.motif ?? `Nouveau prix : ${h.prix.toLocaleString('fr-FR')} ${h.devise}`,
          quartier: l.quartier,
          logementId: l.id,
        })),
    );
    const changementsSignales: ChangementTerrain[] = logements.flatMap((l) =>
      (l.signalements ?? []).map((s) => ({
        date: s.date,
        type: this.libelleTypeSignalement(s.type),
        description: s.description ?? this.libelleTypeSignalement(s.type),
        quartier: l.quartier,
        logementId: l.id,
      })),
    );
    const changementsTerrain = [...changementsPrix, ...changementsSignales].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const ref = logements[0];
    const initiales =
      logements.find((l) => l.noteAgent?.initialesAgent && slugifier(l.noteAgent.nomAgent!) === idRecherche)
        ?.noteAgent?.initialesAgent ?? ref.hote.initiales;

    const espace: EspaceGerant = {
      nom: nomGerant,
      initiales,
      logements,
      quartiersCouverts,
      noteMoyenne,
      nombreAvis: avisTotal,
      nombreVisites,
      nombreInterventions: nombreVisites + changementsTerrain.length,
      changementsTerrain,
    };
    return of(espace);
  }

  /**
   * Enregistre un changement de prix depuis l'espace gérant : met à jour le
   * prix courant du logement et ajoute une entrée à son historique (mock
   * local, en mémoire — à remplacer par un vrai appel API plus tard).
   */
  /**
   * Active ou désactive un logement (visible/masqué dans la liste visiteurs).
   */
  toggleActivation(logementId: string, actif: boolean): { subscribe: (fn: () => void) => void } {
    const logement = this.logementsMock.find((l) => l.id === logementId);
    if (logement) {
      (logement as any)['estActif'] = actif;
      (logement as any)['dateModification'] = new Date().toISOString();
    }
    return { subscribe: (fn: () => void) => fn() };
  }

  mettreAJourPrix(logementId: string, nouveauPrix: number, motif: string): void {
    const logement = this.logementsMock.find((l) => l.id === logementId);
    if (!logement) return;
    logement.historiquePrix = [
      ...(logement.historiquePrix ?? []),
      {
        date: new Date().toISOString().slice(0, 10),
        prix: nouveauPrix,
        devise: logement.devise,
        motif: motif || 'Ajustement remonté par le gérant',
      },
    ];
    logement.prix = nouveauPrix;
  }

  /**
   * Ajoute un signalement terrain (coupure d'eau/courant, changement de
   * conditions, etc.) depuis l'espace gérant (mock local).
   */
  ajouterSignalement(logementId: string, type: TypeSignalement, description: string): void {
    const logement = this.logementsMock.find((l) => l.id === logementId);
    if (!logement) return;
    const signalement: Signalement = {
      type,
      date: new Date().toISOString().slice(0, 10),
      description,
      statut: 'recu',
    };
    logement.signalements = [...(logement.signalements ?? []), signalement];
  }

  // ── Création / édition d'un logement depuis l'espace gérant ──────────────

  /**
   * Crée un nouveau logement rattaché au gérant connecté.
   *
   * Règle métier : un même compte gérant peut être bailleur (annonce en son
   * nom propre, `hote.statut = 'autonome'`) OU agent terrain pour un tiers
   * (`donnees.enTantQueBailleur = false` → `hote.statut = 'represente_par_agent'`,
   * le nom du bailleur réel est saisi séparément, et le gérant est inscrit
   * comme `noteAgent.nomAgent`). C'est ce qui permet à `obtenirEspaceGerant`
   * de retrouver l'annonce ensuite, qu'il l'ait publiée en tant que
   * propriétaire ou en tant qu'agent.
   */
  creerLogement(
    donnees: DonneesLogementFormulaire,
    gerant: { nom: string; initiales: string },
  ): Observable<Logement> {
    const id = `log-${Date.now()}`;
    const aujourdhui = new Date().toISOString().slice(0, 10);

    const hote: Hote = donnees.enTantQueBailleur
      ? {
          nom: gerant.nom,
          initiales: gerant.initiales,
          estVerifie: true,
          note: 0,
          nombreAvis: 0,
          statut: 'autonome',
          membreDepuis: aujourdhui.slice(0, 4),
        }
      : {
          nom: donnees.nomBailleur?.trim() || gerant.nom,
          initiales: this.initialesDe(donnees.nomBailleur || gerant.nom),
          estVerifie: false,
          note: 0,
          nombreAvis: 0,
          statut: 'represente_par_agent',
          langueParlee: donnees.langueBailleur,
          contactUniquementViaAgent: true,
        };

    const logement: Logement = {
      id,
      estActif: true,
      quartier: donnees.quartier.trim(),
      ville: donnees.ville?.trim() || 'Ouagadougou',
      typeBien: donnees.typeBien,
      typeLocation: donnees.typeLocation,
      prix: donnees.prix,
      devise: donnees.devise || 'FCFA',
      commissionKasa: Math.round(donnees.prix * 0.25),
      distanceKm: 0,
      nombreChambres: donnees.nombreChambres ?? 0,
      description: donnees.description?.trim() || '',
      equipements: donnees.equipements ?? [],
      images: donnees.images?.length
        ? donnees.images
        : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
      hote,
      publieDepuis: "à l'instant",
      dateCreation: new Date().toISOString(),
      nombreVisites: 0,
      latitude: donnees.latitude ?? this.centreOuagadougou.latitude,
      longitude: donnees.longitude ?? this.centreOuagadougou.longitude,
      adresse: donnees.adresse,
      conditionsLocation: donnees.conditionsLocation,
      gpsVerifie: donnees.latitude !== undefined && donnees.longitude !== undefined,
      videoUrl: donnees.videoUrl,
      videoDureeSecondes: donnees.videoDureeSecondes,
      surface: donnees.surfaceM2 ? { valeurM2: donnees.surfaceM2 } : undefined,
      infoEau: donnees.infoEau,
      infoElectricite: donnees.infoElectricite,
      historiquePrix: [
        { date: aujourdhui, prix: donnees.prix, devise: donnees.devise || 'FCFA', motif: 'Publication' },
      ],
      cautionAlternative: donnees.cautionAlternative,
    };

    if (!donnees.enTantQueBailleur) {
      logement.noteAgent = {
        qualiteAccompagnement: 0,
        ponctualite: 0,
        exactitudeInfos: 0,
        comportementProfessionnel: 0,
        nombreVisites: 0,
        moyenne: 0,
        nomAgent: gerant.nom,
        initialesAgent: gerant.initiales,
      };
    }

    logement.annonceCertifiee = this.calculerCertification(logement);

    this.logementsMock.unshift(logement);
    return of(logement);
  }

  /**
   * Met à jour un logement existant depuis l'espace gérant (édition complète,
   * pas seulement le prix — voir `mettreAJourPrix` pour le raccourci rapide).
   * Toute modification de prix génère automatiquement une entrée dans
   * `historiquePrix`, comme l'exige la règle de transparence de KaSa.
   */
  mettreAJourLogement(
    id: string,
    donnees: DonneesLogementFormulaire,
  ): Observable<Logement | undefined> {
    const logement = this.logementsMock.find((l) => l.id === id);
    if (!logement) return of(undefined);

    const prixAChange = donnees.prix !== logement.prix;
    const aujourdhui = new Date().toISOString().slice(0, 10);

    logement.typeBien = donnees.typeBien;
    logement.typeLocation = donnees.typeLocation;
    logement.quartier = donnees.quartier.trim();
    logement.ville = donnees.ville?.trim() || logement.ville;
    logement.adresse = donnees.adresse;
    logement.nombreChambres = donnees.nombreChambres ?? logement.nombreChambres;
    logement.surface = donnees.surfaceM2 ? { valeurM2: donnees.surfaceM2 } : logement.surface;
    logement.devise = donnees.devise || logement.devise;
    logement.conditionsLocation = donnees.conditionsLocation;
    logement.description = donnees.description?.trim() || logement.description;
    logement.equipements = donnees.equipements ?? logement.equipements;
    logement.images = donnees.images?.length ? donnees.images : logement.images;
    logement.videoUrl = donnees.videoUrl ?? logement.videoUrl;
    logement.videoDureeSecondes = donnees.videoDureeSecondes ?? logement.videoDureeSecondes;
    logement.infoEau = donnees.infoEau;
    logement.infoElectricite = donnees.infoElectricite;
    logement.cautionAlternative = donnees.cautionAlternative;

    if (donnees.latitude !== undefined && donnees.longitude !== undefined) {
      logement.latitude = donnees.latitude;
      logement.longitude = donnees.longitude;
      logement.gpsVerifie = true;
    }

    // Bailleur représenté par l'agent : le nom/langue du bailleur peuvent être corrigés
    if (!donnees.enTantQueBailleur && donnees.nomBailleur) {
      logement.hote.nom = donnees.nomBailleur.trim();
      logement.hote.langueParlee = donnees.langueBailleur;
    }

    if (prixAChange) {
      logement.prix = donnees.prix;
      logement.commissionKasa = Math.round(donnees.prix * 0.25);
      logement.historiquePrix = [
        ...(logement.historiquePrix ?? []),
        {
          date: aujourdhui,
          prix: donnees.prix,
          devise: logement.devise,
          motif: donnees.motifPrix?.trim() || 'Mise à jour par le gérant',
        },
      ];
    }

    logement.annonceCertifiee = this.calculerCertification(logement);
    return of(logement);
  }

  /**
   * Une annonce n'est « Certifiée » que si TOUTES les preuves de terrain
   * obligatoires ont été fournies : surface, conditions de location, GPS
   * pointé sur la carte, vidéo walkthrough, et état eau/électricité. Reflète
   * exactement les commentaires « obligatoire pour certification » du
   * modèle `Logement` (section 1. CERTIFICATION).
   */
  private calculerCertification(l: Logement): boolean {
    return !!(
      l.surface?.valeurM2 &&
      l.conditionsLocation &&
      l.gpsVerifie &&
      l.videoDureeSecondes &&
      l.infoEau &&
      l.infoElectricite
    );
  }

  private initialesDe(nom: string): string {
    return nom
      .trim()
      .split(/\s+/)
      .map((mot) => mot[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('');
  }

  private libelleTypeSignalement(type: string): string {
    const libelles: Record<string, string> = {
      changement_prix: 'Changement de prix',
      changement_conditions: 'Changement de conditions',
      fausse_annonce: 'Annonce à corriger',
      absence_eau: "Coupure d'eau signalée",
      absence_courant: 'Coupure de courant signalée',
      probleme_securite: 'Problème de sécurité',
    };
    return libelles[type] ?? type;
  }

  // ── Filtrage local (miroir exact de ce que fera l'API) ────────────────────

  private appliquerFiltres(logements: Logement[], filtres?: FiltresLogement): Logement[] {
    if (!filtres) return logements;

    return logements.filter((l) => {
      // Filtre textuel
      if (filtres.texte) {
        const q = filtres.texte.toLowerCase();
        const match =
          l.quartier.toLowerCase().includes(q) ||
          l.typeBien.toLowerCase().includes(q) ||
          l.ville.toLowerCase().includes(q) ||
          (l.description?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }

      // Filtres métier
      if (filtres.typeBien && l.typeBien !== filtres.typeBien) return false;
      if (filtres.quartier && l.quartier.toLowerCase() !== filtres.quartier.toLowerCase())
        return false;
      if (filtres.prixMax !== undefined && l.prix > filtres.prixMax) return false;
      if (filtres.nombreChambresMin !== undefined && l.nombreChambres < filtres.nombreChambresMin)
        return false;
      if (filtres.annonceCertifiee && !l.annonceCertifiee) return false;

      if (filtres.disponibiliteEau) {
        if (l.infoEau?.disponibilite !== 'oui') return false;
      }
      if (filtres.disponibiliteElectricite) {
        if (l.infoElectricite?.disponibilite !== 'oui') return false;
      }

      // ── Filtre géographique (viewport) ──────────────────────────────────
      // C'est ici que l'architecture devient viewport-aware.
      // Le bbox est mis à jour par le composant parent à chaque déplacement
      // de la carte. On ne charge QUE ce qui est visible.
      if (filtres.bornesCarte) {
        const { nord, sud, est, ouest } = filtres.bornesCarte;
        if (l.latitude > nord || l.latitude < sud || l.longitude > est || l.longitude < ouest)
          return false;
      }

      return true;
    });
  }

  /**
   * Convertit les bornes de la carte en paramètres URL pour l'API réelle.
   * À utiliser quand on remplace `of(...)` par `http.get(...)`.
   *
   * Exemple d'appel API :
   *   GET /api/logements?nord=12.45&sud=12.30&est=-1.45&ouest=-1.60&typeBien=Villa
   */
  // private toParams(filtres?: FiltresLogement): HttpParams {
  //   let params = new HttpParams();
  //   if (!filtres) return params;
  //   if (filtres.bornesCarte) {
  //     params = params
  //       .set('nord',  filtres.bornesCarte.nord)
  //       .set('sud',   filtres.bornesCarte.sud)
  //       .set('est',   filtres.bornesCarte.est)
  //       .set('ouest', filtres.bornesCarte.ouest);
  //   }
  //   if (filtres.typeBien)           params = params.set('typeBien', filtres.typeBien);
  //   if (filtres.prixMax)            params = params.set('prixMax', filtres.prixMax);
  //   if (filtres.annonceCertifiee)   params = params.set('certifie', 'true');
  //   return params;
  // }
}
