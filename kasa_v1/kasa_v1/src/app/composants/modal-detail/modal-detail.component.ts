import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  ElementRef,
  HostListener,
  ViewChild,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Logement, StatutBailleur } from '../../models/logement.model';
import { LogementService } from '../../services/logement.service';
import { Artisan } from '../../models/artisan.model';
import { ArtisanService } from '../../services/artisan.service';

import { MapComponent } from '../map/map.component';
import { EvolutionLoyerConfianceComponent } from './evolution-loyer-confiance.component';
import { AuthService } from '../../services/auth.service';
import { BarreNavigationComponent } from '../barre-navigation/barre-navigation.component';

type VueMedia = 'aucune' | 'photos' | 'pano' | 'video' | 'carte';
type SectionAncre = 'galerie' | 'presentation' | 'services' | 'emplacement' | 'avis' | 'prix';
type TypeBesoinAide = 'avance_caution_ameublement';

const PIECES_VISITE_3D: { cle: string; label: string }[] = [
  { cle: 'exterieur', label: 'Extérieur' },
  { cle: 'salon', label: 'Salon' },
  { cle: 'chambre', label: 'Chambre' },
  { cle: 'douche', label: 'Douche' },
];

@Component({
  selector: 'app-modal-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MapComponent,
    EvolutionLoyerConfianceComponent,
    BarreNavigationComponent,
  ],
  templateUrl: './modal-detail.component.html',
  styleUrls: ['./modal-detail.component.css'],
})
export class ModalDetailComponent implements OnInit, OnChanges, OnDestroy {
  /** Optionnel : permet toujours d'utiliser le composant en le pilotant depuis un parent. */
  @Input() logement: Logement | null = null;
  @Output() fermer = new EventEmitter<void>();

  @ViewChild('galerieRef') galerieRef?: ElementRef<HTMLDivElement>;
  @ViewChild('corpsRef') corpsRef?: ElementRef<HTMLDivElement>;
  @ViewChild('lecteurVideo') lecteurVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('stickyHeaderRef') stickyHeaderRef?: ElementRef<HTMLDivElement>;

  // ── Chargement en tant que page (route /logement/:id) ──
  chargementEnCours = false;
  logementIntrouvable = false;
  private routeSub?: Subscription;

  // ── Galerie ──
  indexGalerie = 0;

  // ── Vue média plein écran ──
  vueMedia: VueMedia = 'aucune';

  // ── Visite 3D ──
  pieces3D = PIECES_VISITE_3D;
  pieceActive3D = 'exterieur';

  // ── Sections repliables ──
  sectionsOuvertes: Record<string, boolean> = {
    description: true,
    equipements: true,
    eau: true,
    elec: true,
    noteProprietaire: false,
    noteAgent: false,
  };
  descriptionEtendue = false;

  // ── Avis ──
  avisEtendus = false;

  // ── Formulaire avis locataire (point 7) ──
  commentaireAvis = '';
  noteFormEau = 0;
  noteFormCourant = 0;
  noteFormSecurite = 0;
  noteFormBailleur = 0;
  noteFormVoisinage = 0;
  noteFormProprete = 0;

  // ── Sticky nav ──
  navVisible = false;
  ancreActive: SectionAncre = 'galerie';
  private readonly ancres: SectionAncre[] = [
    'galerie',
    'presentation',
    'services',
    'emplacement',
    'avis',
    'prix',
  ];

  // ── Demande d'aide à l'entrée dans le logement (point 8) ──
  // NB : simple manifestation d'intérêt pour une liste d'attente/qualification,
  // aucun versement réel n'est effectué à ce stade.
  afficherModalAide = false;
  formAideType: TypeBesoinAide = 'avance_caution_ameublement';
  formAideMontant: number | null = null;

  // ── Toast ──
  messageToast = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly estNavigateur: boolean;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    protected readonly auth: AuthService,
    private readonly logementService: LogementService,
    private readonly artisanService: ArtisanService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.estNavigateur = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Si un id est présent dans l'URL, ce composant se comporte comme une page :
    // il charge lui-même le logement correspondant.
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) return;
      this.chargementEnCours = true;
      this.logementIntrouvable = false;
      this.logementService.obtenirLogementParId(id).subscribe({
        next: (logement) => {
          this.chargementEnCours = false;
          this.logement = logement ?? null;
          this.logementIntrouvable = !logement;
          this.reinitialiserEtat();
          if (this.estNavigateur) {
            window.scrollTo(0, 0);
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement du logement', err);
          this.chargementEnCours = false;
          this.logement = null;
          this.logementIntrouvable = true;
        },
      });
    });
  }

  ngOnChanges(): void {
    this.reinitialiserEtat();
  }

  private reinitialiserEtat(): void {
    this.indexGalerie = 0;
    this.vueMedia = 'aucune';
    this.pieceActive3D = 'exterieur';
    this.sectionsOuvertes = {
      description: true,
      equipements: true,
      eau: true,
      elec: true,
      noteProprietaire: false,
      noteAgent: false,
    };
    this.descriptionEtendue = false;
    this.avisEtendus = false;
    this.navVisible = false;
    this.ancreActive = 'galerie';
    this.afficherModalAide = false;
    this.formAideType = 'avance_caution_ameublement';
    this.formAideMontant = null;
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.routeSub?.unsubscribe();
  }

  // ════════ Données dérivées ════════

  get caution(): number {
    return this.logement ? this.logement.prix * 2 : 0;
  }

  get avanceTroisMois(): number {
    return this.logement ? this.logement.prix * 3 : 0;
  }

  get totalEntree(): number {
    return this.caution + this.avanceTroisMois;
  }

  get totalAvis(): number {
    if (!this.logement?.repartitionNotes) return 0;
    const r = this.logement.repartitionNotes;
    return r[5] + r[4] + r[3] + r[2] + r[1];
  }

  get pourcentageNote(): Record<number, number> {
    const total = this.totalAvis || 1;
    const r = this.logement?.repartitionNotes;
    if (!r) return {};
    return {
      5: (r[5] / total) * 100,
      4: (r[4] / total) * 100,
      3: (r[3] / total) * 100,
      2: (r[2] / total) * 100,
      1: (r[1] / total) * 100,
    };
  }

  get dureeVideoFormatee(): string {
    const s = this.logement?.videoDureeSecondes ?? 0;
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min} min ${sec.toString().padStart(2, '0')} s`;
  }

  get avisVisibles() {
    if (!this.logement?.avis) return [];
    return this.avisEtendus ? this.logement.avis : this.logement.avis.slice(0, 2);
  }

  get aDesAvisCaches(): boolean {
    return (this.logement?.avis?.length ?? 0) > 2;
  }

  // ════════ Artisans recommandés dans le quartier ════════

  /** 3-4 artisans vérifiés, filtrés par le quartier du logement affiché. */
  get artisansRecommandes(): Artisan[] {
    if (!this.logement?.quartier) return [];
    return this.artisanService
      .obtenirArtisans({ quartier: this.logement.quartier })
      .slice(0, 4);
  }

  etoilesArtisan(note: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (i < Math.round(note) ? 1 : 0));
  }

  contacterArtisan(a: Artisan): void {
    const besoin = `besoin d'un(e) ${a.metier.toLowerCase()}`;
    const position = this.logement?.quartier ?? a.quartier;
    const url = this.artisanService.construireLienWhatsapp(a, besoin, position);
    window.open(url, '_blank');
  }

  formaterPrix(valeur: number, devise: string): string {
    return `${valeur.toLocaleString('fr-FR')} ${devise}`;
  }

  formaterDistance(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  /** Formate une date ISO (dernier paiement facture, facture SONABEL…) en "3 juil. 2026" */
  formaterDate(dateIso?: string): string {
    if (!dateIso) return '';
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return dateIso;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ════════ Statut bailleur (confiance locataire) ════════

  /** Statut réel du bailleur — 'autonome' par défaut si non renseigné (annonces existantes). */
  get statutBailleur(): StatutBailleur {
    return this.logement?.hote?.statut ?? 'autonome';
  }

  get bailleurEstAutonome(): boolean {
    return this.statutBailleur === 'autonome';
  }

  get bailleurEstRepresente(): boolean {
    return this.statutBailleur === 'represente_par_agent';
  }

  get bailleurNonVerifie(): boolean {
    return this.statutBailleur === 'non_verifie';
  }

  /**
   * Dès que le bailleur n'est pas autonome (représenté ou profil non renseigné),
   * l'agent devient le seul interlocuteur, car c'est lui — et lui seul — qui est
   * réellement vérifié. Important : l'ANNONCE reste toujours 100% certifiée
   * (facture eau/courant, vidéo, GPS) quel que soit le statut du bailleur ;
   * seul le profil personnel du bailleur peut manquer.
   */
  get contactViaAgent(): boolean {
    return !this.bailleurEstAutonome;
  }

  /**
   * Message de transparence affiché au locataire quand le bailleur n'est
   * pas l'interlocuteur direct. On n'invente jamais de profil : on explique
   * la réalité du terrain le plus simplement possible — et on rappelle que
   * l'annonce, elle, est bien vérifiée dans tous les cas.
   */
  get messageStatutBailleur(): string {
    if (this.bailleurEstRepresente) {
      const langue = this.logement?.hote?.langueParlee;
      const raison = langue
        ? `ne parle pas ${langue === 'français' ? 'français' : langue} et n'utilise pas l'application`
        : `n'utilise pas l'application`;
      return `Ce propriétaire ${raison}. Toutes les démarches (visite, questions, contrat) passent par l'agent terrain ci-dessous, qui a vérifié ce logement sur place.`;
    }
    if (this.bailleurNonVerifie) {
      return `Le profil de ce propriétaire n'est pas renseigné sur l'application. Ce logement a néanmoins été entièrement vérifié sur le terrain par l'agent ci-dessous (factures, vidéo, GPS) — c'est lui votre interlocuteur.`;
    }
    return '';
  }

  /** Nom à afficher comme interlocuteur principal dans la carte de contact. */
  get interlocuteurPrincipalNom(): string {
    if (this.contactViaAgent && this.logement?.noteAgent?.nomAgent) {
      return this.logement.noteAgent.nomAgent;
    }
    return this.logement?.hote?.nom ?? '';
  }

  get interlocuteurPrincipalInitiales(): string {
    if (this.contactViaAgent && this.logement?.noteAgent?.initialesAgent) {
      return this.logement.noteAgent.initialesAgent;
    }
    return this.logement?.hote?.initiales ?? '';
  }

  /** Lien routerLink vers la page profil (agent ou bailleur) de l'interlocuteur principal. */
  get lienInterlocuteur(): string[] | null {
    if (!this.logement) return null;
    if (this.contactViaAgent && this.logement.noteAgent?.nomAgent) {
      return ['/profil', 'agent', this.logementService.idAgent(this.logement.noteAgent.nomAgent)];
    }
    if (!this.contactViaAgent && this.logement.hote?.nom) {
      return ['/profil', 'bailleur', this.logementService.idBailleur(this.logement.hote.nom)];
    }
    return null;
  }

  // ════════ Galerie ════════

  cyclerGalerie(): void {
    if (!this.logement) return;
    this.indexGalerie = (this.indexGalerie + 1) % this.logement.images.length;
  }

  allerAGalerie(event: Event, index: number): void {
    event.stopPropagation();
    this.indexGalerie = index;
  }

  // ════════ Vues média ════════

  ouvrirVueMedia(event: Event, vue: VueMedia): void {
    event.stopPropagation();
    this.vueMedia = vue;
    document.body.style.overflow = 'hidden';
    if (vue === 'pano') this.pieceActive3D = 'exterieur';
  }

  fermerVueMedia(): void {
    if (this.lecteurVideo) {
      this.lecteurVideo.nativeElement.pause();
    }
    this.vueMedia = 'aucune';
    document.body.style.overflow = '';
  }

  changerPiece3D(cle: string): void {
    this.pieceActive3D = cle;
  }

  imagePiece3D(cle: string): string {
    if (this.logement?.visite3D) {
      const trouve = this.logement.visite3D.find(
        (v) => v.label.toLowerCase() === this.libellePiece(cle).toLowerCase(),
      );
      if (trouve) return trouve.imageUrl;
    }
    return this.logement?.images[0] ?? '';
  }

  libellePiece(cle: string): string {
    return this.pieces3D.find((p) => p.cle === cle)?.label ?? cle;
  }

  // ════════ Sections ════════

  basculerSection(nom: string): void {
    this.sectionsOuvertes[nom] = !this.sectionsOuvertes[nom];
  }

  estSectionOuverte(nom: string): boolean {
    return this.sectionsOuvertes[nom] !== false;
  }

  basculerDescription(): void {
    this.descriptionEtendue = !this.descriptionEtendue;
  }

  basculerAvis(): void {
    this.avisEtendus = !this.avisEtendus;
  }

  // ════════ Navigation scroll-spy ════════

  allerASection(id: SectionAncre): void {
    if (!this.estNavigateur) return;
    const conteneur = this.corpsRef?.nativeElement;
    const cible = conteneur?.querySelector('#ancre-' + id) as HTMLElement | null;
    if (!cible) return;
    const decalage = (this.stickyHeaderRef?.nativeElement.offsetHeight ?? 0) + 8;
    const top = cible.getBoundingClientRect().top + window.scrollY - decalage;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  @HostListener('window:scroll')
  surScrollCorps(): void {
    if (!this.estNavigateur) return;
    const conteneur = this.corpsRef?.nativeElement;
    const galerie = this.galerieRef?.nativeElement;
    if (!conteneur || !galerie) return;
    const hauteurGalerie = galerie.offsetHeight;
    const topGalerie = galerie.getBoundingClientRect().top + window.scrollY;
    this.navVisible = window.scrollY > topGalerie + hauteurGalerie - 40;

    const decalage = (this.stickyHeaderRef?.nativeElement.offsetHeight ?? 0) + 130;
    let actif: SectionAncre = 'galerie';
    for (const id of this.ancres) {
      const el = conteneur.querySelector('#ancre-' + id) as HTMLElement | null;
      if (el) {
        const elTop = el.getBoundingClientRect().top + window.scrollY;
        if (window.scrollY + decalage >= elTop) actif = id;
      }
    }
    this.ancreActive = actif;
  }

  // ════════ Toast ════════

  // ── Soumettre un avis (point 7) ──
  soumettreAvis(): void {
    if (!this.commentaireAvis?.trim()) return;
    // TODO: appel API pour enregistrer l'avis
    this.afficherToast('✅ Votre avis a été envoyé — merci pour votre contribution !');
    // Réinitialiser le formulaire
    this.commentaireAvis = '';
    this.noteFormEau = 0;
    this.noteFormCourant = 0;
    this.noteFormSecurite = 0;
    this.noteFormBailleur = 0;
    this.noteFormVoisinage = 0;
    this.noteFormProprete = 0;
  }

  // ── Demande d'aide à l'entrée dans le logement (point 8) ──

  ouvrirFormulaireAide(): void {
    this.afficherModalAide = true;
    if (this.estNavigateur) document.body.style.overflow = 'hidden';
  }

  fermerFormulaireAide(): void {
    this.afficherModalAide = false;
    if (this.estNavigateur) document.body.style.overflow = '';
  }

  soumettreDemandeAide(): void {
    if (!this.formAideMontant || this.formAideMontant <= 0) return;
    // TODO: appel API pour enregistrer la demande dans la liste d'attente/qualification
    // du futur dispositif d'accompagnement financier. Aucun versement réel n'est
    // effectué ici : on collecte uniquement le besoin exprimé (type + montant) afin
    // de qualifier la demande avant tout lancement effectif du produit.
    console.log("Demande d'aide manifestée", {
      logementId: this.logement?.id,
      type: this.formAideType,
      montant: this.formAideMontant,
    });
    this.afficherToast(
      '✅ Votre demande a bien été enregistrée. Nous vous recontacterons dès que possible.',
    );
    this.formAideType = 'avance_caution_ameublement';
    this.formAideMontant = null;
    this.fermerFormulaireAide();
  }

  reserverVisite(): void {
    if (!this.auth.estConnecte()) {
      this.auth.ouvrirModal('connexion');
      this.afficherToast('Connectez-vous pour réserver une visite');
      return;
    }
    this.afficherToast("📅 Demande de visite envoyée ! L'agent vous contactera sous 24h.");
  }

  afficherToast(message: string): void {
    this.messageToast = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.messageToast = ''), 2800);
  }

  // ════════ Retour à la recherche ════════

  retourALaRecherche(): void {
    this.fermer.emit();
    this.router.navigate(['/home']);
  }

  @HostListener('document:keydown.escape')
  surEchap(): void {
    if (this.afficherModalAide) {
      this.fermerFormulaireAide();
    } else if (this.vueMedia !== 'aucune') {
      this.fermerVueMedia();
    } else {
      this.retourALaRecherche();
    }
  }
}
