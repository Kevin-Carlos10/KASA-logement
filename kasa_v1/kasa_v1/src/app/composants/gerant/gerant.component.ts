import { Component, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LogementService } from '../../services/logement.service';
import { AuthService } from '../../services/auth.service';
import { EspaceGerant } from '../../models/profil.model';
import {
  DisponibiliteEau,
  DisponibiliteElectricite,
  DonneesLogementFormulaire,
  Logement,
  TypeBien,
  TypeCompteurEau,
  TypeCompteurElec,
  TypeLocation,
  TypeSignalement,
} from '../../models/logement.model';
import { BarreNavigationComponent } from '../barre-navigation/barre-navigation.component';
import { MapComponent } from '../map/map.component';

const QUARTIERS_OUAGA = [
  'Balkuy', 'Bilbalogho', 'Cissin', 'Dassasgho', 'Gounghin', 'Hamdalaye',
  'Kalgondin', 'Kamsonghin', 'Karpala', 'Kilwin', 'Kologh-Naaba', 'Koubri',
  'Larlé', 'Moemga', 'Nongr-Masson', 'Ouaga 2000', 'Patte d\'Oie',
  'Pissy', 'Samandin', 'Secteur 15', 'Secteur 17', 'Secteur 22', 'Secteur 27',
  'Secteur 28', 'Secteur 30', 'Secteur 50', 'Sig-Nonghin', 'Tampouy',
  'Wemtenga', 'Windyam', 'Zogona', 'Zongo',
];

@Component({
  selector: 'app-gerant',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, BarreNavigationComponent, MapComponent],
  templateUrl: './gerant.component.html',
  styleUrls: ['./gerant.component.css'],
})
export class GerantComponent implements OnInit {
  espace: EspaceGerant | null = null;
  chargementEnCours = true;
  espaceIntrouvable = false;

  logementEnEditionPrix: string | null = null;
  nouveauPrix: number | null = null;
  motifPrix = '';

  logementEnEditionSignalement: string | null = null;
  typeSignalementChoisi: TypeSignalement = 'changement_conditions';
  descriptionSignalement = '';

  readonly typesSignalement: { valeur: TypeSignalement; libelle: string }[] = [
    { valeur: 'changement_prix', libelle: 'Changement de prix' },
    { valeur: 'changement_conditions', libelle: 'Changement de conditions' },
    { valeur: 'absence_eau', libelle: "Coupure d'eau" },
    { valeur: 'absence_courant', libelle: 'Coupure de courant' },
    { valeur: 'probleme_securite', libelle: 'Problème de sécurité' },
    { valeur: 'fausse_annonce', libelle: 'Annonce à corriger' },
  ];

  // ── Formulaire ──
  panneauFormulaireOuvert = false;
  modeFormulaire: 'creation' | 'edition' = 'creation';
  logementIdEnEdition: string | null = null;
  brouillon: DonneesLogementFormulaire = this.brouillonVierge();
  nouvelEquipement = '';
  erreurFormulaire = '';
  enregistrementEnCours = false;

  // ── Photos & vidéo ──
  photosPreview: { url: string; source: 'camera' | 'galerie' }[] = [];
  videoPreview: { url: string; duree?: number } | null = null;
  uploadPhotoEnCours = false;
  uploadVideoEnCours = false;

  // ── Quartier autocomplete ──
  quartierQuery = '';
  quartiersFiltered: string[] = [];
  quartierDropdownVisible = false;
  readonly tousQuartiers = QUARTIERS_OUAGA;

  readonly typesBien: TypeBien[] = ['Studio', 'Chambre', 'Appartement', 'Magasin', 'Mini villa', 'Villa'];
  readonly typesLocation: TypeLocation[] = ['Célibat', 'Famille', 'Colocation'];
  readonly optionsDisponibilite: { valeur: DisponibiliteEau | DisponibiliteElectricite; libelle: string }[] = [
    { valeur: 'oui', libelle: 'Disponible' },
    { valeur: 'intermittent', libelle: 'Intermittent' },
    { valeur: 'non', libelle: 'Indisponible' },
  ];
  readonly optionsCompteur: { valeur: TypeCompteurEau | TypeCompteurElec; libelle: string }[] = [
    { valeur: 'individuel', libelle: 'Individuel' },
    { valeur: 'partage', libelle: 'Partagé' },
  ];
  readonly optionsFrequenceCoupures = [
    { valeur: 'jamais', libelle: 'Jamais' },
    { valeur: 'rarement', libelle: 'Rarement' },
    { valeur: 'parfois', libelle: 'Parfois' },
    { valeur: 'souvent', libelle: 'Souvent' },
  ] as const;

  constructor(
    private readonly logementService: LogementService,
    readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.chargerEspace();
  }

  get utilisateur() {
    return this.auth.utilisateur();
  }

  get estGerant(): boolean {
    return this.utilisateur?.role === 'gerant';
  }

  private chargerEspace(): void {
    const u = this.utilisateur;
    if (!u || u.role !== 'gerant') {
      this.chargementEnCours = false;
      this.espaceIntrouvable = true;
      return;
    }
    this.chargementEnCours = true;
    this.logementService.obtenirEspaceGerant(`${u.prenom} ${u.nom}`).subscribe({
      next: (espace) => {
        this.chargementEnCours = false;
        this.espace = espace ?? null;
        this.espaceIntrouvable = !espace;
      },
      error: () => {
        this.chargementEnCours = false;
        this.espace = null;
        this.espaceIntrouvable = true;
      },
    });
  }

  formaterPrix(valeur: number, devise: string): string {
    return `${valeur.toLocaleString('fr-FR')} ${devise}`;
  }

  // ── Activation / désactivation ──

  /**
   * Un logement est activable/désactivable uniquement si sa création
   * OU sa dernière modification remonte à moins de 6 mois.
   */
  estActivable(l: Logement): boolean {
    const ref = l.dateModification ?? l.dateCreation;
    if (!ref) return false;
    const ms = Date.now() - new Date(ref).getTime();
    const sixMoisMs = 6 * 30 * 24 * 60 * 60 * 1000;
    return ms < sixMoisMs;
  }

  toggleActif(l: Logement): void {
    if (!this.estActivable(l)) return;
    this.logementService.toggleActivation(l.id, !l.estActif).subscribe(() => {
      l.estActif = !l.estActif;
    });
  }

  // ── Modifier le prix ──

  ouvrirEditionPrix(logementId: string, prixActuel: number): void {
    this.logementEnEditionSignalement = null;
    this.logementEnEditionPrix = logementId;
    this.nouveauPrix = prixActuel;
    this.motifPrix = '';
  }

  annulerEditionPrix(): void { this.logementEnEditionPrix = null; }

  validerNouveauPrix(): void {
    if (!this.logementEnEditionPrix || !this.nouveauPrix || this.nouveauPrix <= 0) return;
    this.logementService.mettreAJourPrix(this.logementEnEditionPrix, this.nouveauPrix, this.motifPrix);
    this.logementEnEditionPrix = null;
    this.chargerEspace();
  }

  // ── Signaler ──

  ouvrirSignalement(logementId: string): void {
    this.logementEnEditionPrix = null;
    this.logementEnEditionSignalement = logementId;
    this.typeSignalementChoisi = 'changement_conditions';
    this.descriptionSignalement = '';
  }

  annulerSignalement(): void { this.logementEnEditionSignalement = null; }

  validerSignalement(): void {
    if (!this.logementEnEditionSignalement || !this.descriptionSignalement.trim()) return;
    this.logementService.ajouterSignalement(
      this.logementEnEditionSignalement,
      this.typeSignalementChoisi,
      this.descriptionSignalement.trim(),
    );
    this.logementEnEditionSignalement = null;
    this.chargerEspace();
  }

  // ── Formulaire création/édition ──

  private brouillonVierge(): DonneesLogementFormulaire {
    return {
      enTantQueBailleur: true,
      nomBailleur: '',
      langueBailleur: '',
      typeBien: 'Studio',
      typeLocation: 'Célibat',
      quartier: '',
      ville: 'Ouagadougou',
      adresse: '',
      nombreChambres: 1,
      surfaceM2: undefined,
      prix: 0,
      devise: 'FCFA',
      conditionsLocation: '',
      motifPrix: '',
      latitude: undefined,
      longitude: undefined,
      description: '',
      equipements: [],
      cuisine: false,
      wcInterne: false,
      doucheInterne: false,
      images: [],
      videoUrl: '',
      videoDureeSecondes: undefined,
      infoEau: { disponibilite: 'oui', typeCompteur: 'individuel' },
      dateFactureOnea: '',
      infoElectricite: { disponibilite: 'oui', typeCompteur: 'individuel', estCashPower: false },
      dateFactureSonabel: '',
      cautionAlternative: undefined,
    };
  }

  ouvrirCreation(): void {
    this.logementEnEditionPrix = null;
    this.logementEnEditionSignalement = null;
    this.modeFormulaire = 'creation';
    this.logementIdEnEdition = null;
    this.brouillon = this.brouillonVierge();
    this.photosPreview = [];
    this.videoPreview = null;
    this.quartierQuery = '';
    this.quartiersFiltered = [];
    this.erreurFormulaire = '';
    this.panneauFormulaireOuvert = true;
  }

  ouvrirEdition(l: Logement): void {
    this.logementEnEditionPrix = null;
    this.logementEnEditionSignalement = null;
    this.modeFormulaire = 'edition';
    this.logementIdEnEdition = l.id;
    const estBailleur = this.estGerantBailleurDe(l);
    this.brouillon = {
      enTantQueBailleur: estBailleur,
      nomBailleur: estBailleur ? '' : l.hote.nom,
      langueBailleur: l.hote.langueParlee ?? '',
      typeBien: l.typeBien,
      typeLocation: l.typeLocation,
      quartier: l.quartier,
      ville: l.ville,
      adresse: l.adresse ?? '',
      nombreChambres: l.nombreChambres,
      surfaceM2: l.surface?.valeurM2,
      prix: l.prix,
      devise: l.devise,
      conditionsLocation: l.conditionsLocation ?? '',
      motifPrix: '',
      latitude: l.latitude,
      longitude: l.longitude,
      description: l.description,
      equipements: [...(l.equipements ?? [])],
      cuisine: l.cuisine ?? false,
      wcInterne: l.wcInterne ?? false,
      doucheInterne: l.doucheInterne ?? false,
      images: [...(l.images ?? [])],
      videoUrl: l.videoUrl ?? '',
      videoDureeSecondes: l.videoDureeSecondes,
      infoEau: l.infoEau ? { ...l.infoEau } : { disponibilite: 'oui', typeCompteur: 'individuel' },
      dateFactureOnea: l.infoEau?.dernierePaiementDate ?? '',
      infoElectricite: l.infoElectricite
        ? { ...l.infoElectricite }
        : { disponibilite: 'oui', typeCompteur: 'individuel', estCashPower: false },
      dateFactureSonabel: l.infoElectricite?.derniereFactureDate ?? '',
      cautionAlternative: l.cautionAlternative ? { ...l.cautionAlternative } : undefined,
    };
    this.quartierQuery = l.quartier;
    this.photosPreview = (l.images ?? []).map(url => ({ url, source: 'galerie' as const }));
    this.videoPreview = l.videoUrl ? { url: l.videoUrl, duree: l.videoDureeSecondes } : null;
    this.erreurFormulaire = '';
    this.panneauFormulaireOuvert = true;
  }

  fermerFormulaire(): void {
    this.panneauFormulaireOuvert = false;
    this.logementIdEnEdition = null;
  }

  private estGerantBailleurDe(l: Logement): boolean {
    const u = this.utilisateur;
    if (!u) return true;
    return l.hote.nom.trim().toLowerCase() === `${u.prenom} ${u.nom}`.trim().toLowerCase();
  }

  // ── Quartier autocomplete ──

  onQuartierInput(): void {
    const q = this.quartierQuery.trim().toLowerCase();
    if (!q) {
      this.quartiersFiltered = [];
      this.quartierDropdownVisible = false;
      this.brouillon.quartier = '';
      return;
    }
    this.quartiersFiltered = this.tousQuartiers.filter(n => n.toLowerCase().includes(q));
    this.quartierDropdownVisible = this.quartiersFiltered.length > 0;
  }

  choisirQuartier(nom: string): void {
    this.brouillon.quartier = nom;
    this.quartierQuery = nom;
    this.quartierDropdownVisible = false;
  }

  fermerDropdownQuartier(): void {
    setTimeout(() => { this.quartierDropdownVisible = false; }, 150);
  }

  // ── Photos ──

  declencherCamera(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = true;
    input.onchange = (e) => this.traiterFichiersPhoto(e, 'camera');
    input.click();
  }

  declencherGaleriePhoto(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => this.traiterFichiersPhoto(e, 'galerie');
    input.click();
  }

  private traiterFichiersPhoto(e: Event, source: 'camera' | 'galerie'): void {
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;
    this.uploadPhotoEnCours = true;
    const promises = Array.from(files).map(f => this.lireDataUrl(f).then(url => {
      this.photosPreview.push({ url, source });
      this.brouillon.images.push(url);
    }));
    Promise.all(promises).finally(() => { this.uploadPhotoEnCours = false; });
  }

  retirerPhoto(index: number): void {
    this.photosPreview.splice(index, 1);
    this.brouillon.images.splice(index, 1);
  }

  // ── Vidéo ──

  declencherCameraVideo(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.capture = 'environment';
    input.onchange = (e) => this.traiterFichierVideo(e);
    input.click();
  }

  declencherGalerieVideo(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => this.traiterFichierVideo(e);
    input.click();
  }

  private traiterFichierVideo(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadVideoEnCours = true;
    this.lireDataUrl(file).then(url => {
      // Extraire la durée via un élément video temporaire
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.onloadedmetadata = () => {
        const duree = Math.round(vid.duration);
        this.videoPreview = { url, duree };
        this.brouillon.videoUrl = url;
        this.brouillon.videoDureeSecondes = duree;
        this.uploadVideoEnCours = false;
        URL.revokeObjectURL(vid.src);
      };
      vid.src = URL.createObjectURL(file);
    });
  }

  supprimerVideo(): void {
    this.videoPreview = null;
    this.brouillon.videoUrl = '';
    this.brouillon.videoDureeSecondes = undefined;
  }

  private lireDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Équipements ──

  ajouterEquipement(): void {
    const valeur = this.nouvelEquipement.trim();
    if (!valeur || this.brouillon.equipements.includes(valeur)) return;
    this.brouillon.equipements.push(valeur);
    this.nouvelEquipement = '';
  }

  retirerEquipement(index: number): void {
    this.brouillon.equipements.splice(index, 1);
  }

  // ── Localisation ──

  get positionCarte(): { latitude: number; longitude: number } | null {
    return this.brouillon.latitude !== undefined && this.brouillon.longitude !== undefined
      ? { latitude: this.brouillon.latitude, longitude: this.brouillon.longitude }
      : null;
  }

  onPositionChoisie(position: { latitude: number; longitude: number }): void {
    this.brouillon.latitude = position.latitude;
    this.brouillon.longitude = position.longitude;
    // Géocoder automatiquement pour déduire le quartier
    this.geocoderQuartier(position.latitude, position.longitude);
  }

  private geocoderQuartier(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fr`;
    fetch(url)
      .then(r => r.json())
      .then((data: any) => {
        const addr = data.address ?? {};
        const candidat =
          addr.neighbourhood ?? addr.suburb ?? addr.city_district ?? addr.quarter ?? '';
        if (candidat) {
          // Trouver le quartier KaSa le plus proche dans la liste
          const normalise = (s: string) => s.toLowerCase().replace(/[-'\s]+/g, '');
          const match = this.tousQuartiers.find(q =>
            normalise(q).includes(normalise(candidat)) ||
            normalise(candidat).includes(normalise(q))
          );
          if (match) {
            this.brouillon.quartier = match;
            this.quartierQuery = match;
          } else {
            this.brouillon.quartier = candidat;
            this.quartierQuery = candidat;
          }
        }
      })
      .catch(() => {/* géocodage optionnel, on ignore les erreurs réseau */});
  }

  // ── Validation & soumission ──

  private validerFormulaire(): string {
    const b = this.brouillon;
    if (!b.quartier.trim()) return 'Le quartier est obligatoire.';
    if (!b.nombreChambres || b.nombreChambres < 0) return 'Le nombre de chambres est obligatoire.';
    if (!b.prix || b.prix <= 0) return 'Le prix doit être supérieur à 0.';
    if (!b.description.trim()) return 'La description est obligatoire.';
    if (b.latitude === undefined || b.longitude === undefined)
      return "Pointez l'emplacement du logement sur la carte (position requise).";
    if (this.photosPreview.length === 0) return 'Au moins une photo est obligatoire.';
    if (!this.videoPreview) return 'La vidéo complète du logement est obligatoire.';
    if (!b.dateFactureOnea) return 'La date de la dernière facture ONEA est obligatoire.';
    if (!b.dateFactureSonabel) return 'La date de la dernière facture SONABEL est obligatoire.';
    if (!b.enTantQueBailleur && !b.nomBailleur?.trim())
      return 'Indiquez le nom du bailleur que vous représentez.';
    return '';
  }

  enregistrerLogement(): void {
    const erreur = this.validerFormulaire();
    if (erreur) { this.erreurFormulaire = erreur; return; }
    const u = this.utilisateur;
    if (!u) return;
    this.erreurFormulaire = '';
    this.enregistrementEnCours = true;
    const gerant = { nom: `${u.prenom} ${u.nom}`, initiales: u.initiales };
    const suite = () => {
      this.enregistrementEnCours = false;
      this.fermerFormulaire();
      this.chargerEspace();
    };
    if (this.modeFormulaire === 'creation') {
      this.logementService.creerLogement(this.brouillon, gerant).subscribe(suite);
    } else if (this.logementIdEnEdition) {
      this.logementService.mettreAJourLogement(this.logementIdEnEdition, this.brouillon).subscribe(suite);
    }
  }

  formaterDureeVideo(secondes?: number): string {
    if (!secondes) return '';
    const m = Math.floor(secondes / 60);
    const s = secondes % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
