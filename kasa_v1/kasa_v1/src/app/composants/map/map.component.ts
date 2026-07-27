
import {
  afterNextRender,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { MapService } from '../../services/map.service';


import { Logement } from '../../models/logement.model';
import {
  CategorieProximite,
  CoucheAffichage,
  FondDeCarte,
  LieuReference,
  NiveauZone,
  PointCarte,
  POINTS_INTERET_OUAGA,
  QUARTIERS_OUAGADOUGOU,
  ResultatProximite,
  VILLES_BURKINA,
  ZoneQuartier,
  ZoneVille,
} from '../../models/map.model';
import { FiltresLogement } from '../../models/logement.model';
import { LogementService } from '../../services/logement.service';

/** Icônes emoji par catégorie de proximité */
const ICONES_CATEGORIE: Record<CategorieProximite, string> = {
  travail: '💼',
  universite: '🎓',
  ecole: '🏫',
  hopital: '🏥',
  marche: '🛒',
  autre: '📍',
};

const LABELS_CATEGORIE: Record<CategorieProximite, string> = {
  travail: 'Lieu de travail',
  universite: 'Université',
  ecole: 'École',
  hopital: 'Hôpital',
  marche: 'Marché',
  autre: 'Autre lieu',
};

let compteurId = 0;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnChanges, OnDestroy {
  // ── Inputs du parent ──────────────────────────────────────────────────────

  /**
   * Filtres métier venant de la barre de filtres (type, budget, quartier…).
   * La carte les combine avec son propre bbox pour recharger les logements.
   */
  @Input() filtresMetier: FiltresLogement = {};

  /**
   * Logements fournis en mode "liste pilote carte" (optionnel).
   * Si absent, la carte gère elle-même le chargement via viewport.
   */
  @Input() logements: Logement[] = [];

  /** Mode léger pour le modal-detail (sans contrôles de zones) */
  @Input() modeMini = false;

  /** Centre et zoom initiaux */
  @Input() centre = { latitude: 12.3714, longitude: -1.5197 };
  @Input() zoom = 12;

  /**
   * Mode « pointer une position » : utilisé par le formulaire de création /
   * édition d'un logement (espace gérant). Quand actif, un clic sur la carte
   * place (ou déplace) un marqueur déplaçable et émet `positionChoisie`.
   */
  @Input() modeSelectionPosition = false;

  /** Position initiale du marqueur en mode sélection (ex : logement en édition) */
  @Input() positionInitiale: { latitude: number; longitude: number } | null = null;

  // ── Outputs ───────────────────────────────────────────────────────────────

  /** Émis quand l'utilisateur clique sur un marqueur */
  @Output() logementSelectionne = new EventEmitter<string>();

  /** Émis en mode sélection, à chaque clic ou déplacement du marqueur de position */
  @Output() positionChoisie = new EventEmitter<{ latitude: number; longitude: number }>();

  /**
   * Émis à chaque déplacement de la carte avec le nouveau bbox.
   * Le parent l'utilise pour recharger la liste de logements.
   */
  @Output() viewportChange = new EventEmitter<FiltresLogement['bornesCarte']>();

  /** Émis quand l'utilisateur filtre par quartier via la popup */
  @Output() filtrerParQuartier = new EventEmitter<string>();

  @ViewChild('conteneurCarte', { static: true }) conteneurCarte!: ElementRef<HTMLDivElement>;

  // ── Services ──────────────────────────────────────────────────────────────

  private readonly mapService = inject(MapService);
  private readonly logementService = inject(LogementService);

  // ── État interne ──────────────────────────────────────────────────────────

  fondCourant: FondDeCarte = 'plan';
  niveauZone: NiveauZone = 'quartier';
  panneauOuvert: 'aucun' | 'couches' | 'proximite' = 'aucun';

  /** Logements chargés par le viewport (mode autonome) */
  readonly logementsViewport = signal<Logement[]>([]);

  /** true pendant le rechargement après déplacement de la carte */
  readonly chargementEnCours = signal(false);

  // Couches POI
  couchesAffichage: CoucheAffichage[] = [
    { categorie: 'hopital', label: 'Hôpitaux', couleur: '#e8552d', actif: false },
    { categorie: 'universite', label: 'Universités', couleur: '#5c5c5c', actif: false },
    { categorie: 'ecole', label: 'Écoles', couleur: '#C1440E', actif: false },
    { categorie: 'marche', label: 'Marchés', couleur: '#2f8f4e', actif: false },
  ];

  // Zones géographiques
  afficherQuartiers = false;
  afficherVilles = false;
  quartiers: ZoneQuartier[] = QUARTIERS_OUAGADOUGOU;
  villes: ZoneVille[] = VILLES_BURKINA;

  // Recherche par proximité
  lieuxReference: LieuReference[] = [];
  nouvelleCategorie: CategorieProximite = 'travail';
  nouveauLibelle = '';
  resultatsProximite: ResultatProximite[] = [];
  readonly categoriesProximite: CategorieProximite[] = [
    'travail',
    'universite',
    'ecole',
    'hopital',
    'marche',
    'autre',
  ];
  readonly iconesCategorie = ICONES_CATEGORIE;
  readonly labelsCategorie = LABELS_CATEGORIE;

  // Légende couleurs zones
  legendeVisible = false;
  readonly legendePrix = [
    { couleur: '#1D8A52', label: '< 30 000 FCFA' },
    { couleur: '#F5A623', label: '30 000 – 80 000 FCFA' },
    { couleur: '#C1440E', label: '80 000 – 200 000 FCFA' },
    { couleur: '#8A2F07', label: '> 200 000 FCFA' },
  ];

  private abonnements: Subscription[] = [];
  private carteInitialisee = false;

  /**
   * Subject interne qui reçoit le bbox à chaque `moveend`.
   * Le debounce de 400 ms évite de spammer l'API quand l'utilisateur
   * fait glisser la carte rapidement.
   */
  private readonly viewportChange$ = new Subject<FiltresLogement['bornesCarte']>();

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  constructor() {
    afterNextRender(() => {
      this.mapService.initialiserCarte(
        this.conteneurCarte.nativeElement,
        { centre: this.centre, zoom: this.zoom },
        this.fondCourant,
      );
      this.carteInitialisee = true;
      this.mettreAJourMarqueurs();
      this.mettreAJourPointsInteret();

      if (!this.modeMini) {
        this.mapService.afficherZonesQuartiers(this.quartiers);
        this.afficherQuartiers = true;
      }

      // ── Événement moveend : la carte informe le parent du nouveau bbox ──
      this.mapService.obtenirInstance()?.on('moveend', () => {
        const bbox = this.obtenirBboxCourante();
        if (bbox) {
          this.viewportChange.emit(bbox); // informe le parent
          this.viewportChange$.next(bbox); // déclenche le rechargement local
        }
      });

      // ── Rechargement debounced des logements après déplacement ──────────
      // 400 ms de délai : on attend que l'utilisateur finisse de bouger
      // la carte avant d'appeler le service.
      this.abonnements.push(
        this.viewportChange$.pipe(debounceTime(400)).subscribe((bbox) => {
          this.rechargerLogementsViewport(bbox);
        }),
      );

      // Premier chargement : attendre que la carte soit rendue (event 'load')
      // avant d'appeler getBounds(), sinon la carte n'est pas encore prête
      // et getBounds() retourne null → "Chargement des logements…" reste bloqué.
      const mappe = this.mapService.obtenirInstance();
      if (mappe) {
        const doFirstLoad = () => {
          const bbox = this.obtenirBboxCourante();
          if (bbox) {
            this.rechargerLogementsViewport(bbox);
          } else {
            // Fallback : bbox couvrant tout Ouagadougou si getBounds() échoue encore
            this.rechargerLogementsViewport({
              nord: 12.45,
              sud: 12.28,
              est: -1.44,
              ouest: -1.6,
            });
          }
        };
        if (mappe.loaded()) {
          doFirstLoad();
        } else {
          mappe.once('load', doFirstLoad);
        }
      }

      this.abonnements.push(
        this.mapService.selection$.subscribe((sel) => {
          if (sel.type === 'point') this.logementSelectionne.emit(sel.id);
          if (sel.type === 'quartier') this.filtrerParQuartier.emit(sel.id);
        }),
        this.mapService.niveauZone$.subscribe((n) => (this.niveauZone = n)),
      );

      // ── Mode sélection de position (création / édition d'un logement) ──
      this.mapService.obtenirInstance()?.on('click', (e) => {
        if (!this.modeSelectionPosition) return;
        this.placerEtEmettrePosition(e.lngLat.lng, e.lngLat.lat);
      });

      if (this.modeSelectionPosition) {
        this.activerCurseurSelection();
        if (this.positionInitiale) {
          this.mapService.placerMarqueurPosition(
            this.positionInitiale.longitude,
            this.positionInitiale.latitude,
            (lng, lat) => this.positionChoisie.emit({ latitude: lat, longitude: lng }),
          );
        }
      }
    });
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (!this.carteInitialisee) return;

    // Si le parent envoie des logements directement, on les affiche
    if (ch['logements']) {
      this.mettreAJourMarqueurs();
    }

    // Si les filtres métier changent, on relance le chargement viewport
    if (ch['filtresMetier']) {
      const bbox = this.obtenirBboxCourante();
      if (bbox) this.rechargerLogementsViewport(bbox);
    }

    if (ch['pointsInteret']) this.mettreAJourPointsInteret();

    // Activation / désactivation du mode sélection de position
    if (ch['modeSelectionPosition']) {
      if (this.modeSelectionPosition) {
        this.activerCurseurSelection();
        if (this.positionInitiale) {
          this.mapService.placerMarqueurPosition(
            this.positionInitiale.longitude,
            this.positionInitiale.latitude,
            (lng, lat) => this.positionChoisie.emit({ latitude: lat, longitude: lng }),
          );
        }
      } else {
        this.desactiverCurseurSelection();
        this.mapService.retirerMarqueurPosition();
      }
    } else if (ch['positionInitiale'] && this.modeSelectionPosition && this.positionInitiale) {
      this.mapService.placerMarqueurPosition(
        this.positionInitiale.longitude,
        this.positionInitiale.latitude,
        (lng, lat) => this.positionChoisie.emit({ latitude: lat, longitude: lng }),
      );
    }
  }

  private placerEtEmettrePosition(longitude: number, latitude: number): void {
    this.mapService.placerMarqueurPosition(longitude, latitude, (lng, lat) =>
      this.positionChoisie.emit({ latitude: lat, longitude: lng }),
    );
    this.positionChoisie.emit({ latitude, longitude });
  }

  private activerCurseurSelection(): void {
    const canvas = this.mapService.obtenirInstance()?.getCanvas();
    if (canvas) canvas.style.cursor = 'crosshair';
  }

  private desactiverCurseurSelection(): void {
    const canvas = this.mapService.obtenirInstance()?.getCanvas();
    if (canvas) canvas.style.cursor = '';
  }

  ngOnDestroy(): void {
    this.abonnements.forEach((s) => s.unsubscribe());
    this.mapService.detruireCarte();
  }

  // ── Fond de carte ─────────────────────────────────────────────────────────

  changerFond(fond: FondDeCarte): void {
    this.fondCourant = fond;
    this.mapService.changerFondDeCarte(fond);
  }

  // ── Couches POI ───────────────────────────────────────────────────────────

  basculerCouche(couche: CoucheAffichage): void {
    couche.actif = !couche.actif;
    this.mettreAJourPointsInteret();
  }

  // ── Zones géographiques ───────────────────────────────────────────────────

  basculerQuartiers(): void {
    this.afficherQuartiers = !this.afficherQuartiers;
    if (this.afficherQuartiers) {
      this.afficherVilles = false;
      this.mapService.masquerZonesVilles();
      this.mapService.afficherZonesQuartiers(this.quartiers);
      this.legendeVisible = true;
    } else {
      this.mapService.masquerZonesQuartiers();
      this.legendeVisible = false;
    }
  }

  basculerVilles(): void {
    this.afficherVilles = !this.afficherVilles;
    if (this.afficherVilles) {
      this.afficherQuartiers = false;
      this.mapService.masquerZonesQuartiers();
      this.mapService.afficherZonesVilles(this.villes);
      this.legendeVisible = true;
    } else {
      this.mapService.masquerZonesVilles();
      this.legendeVisible = false;
    }
  }

  // ── Proximité ─────────────────────────────────────────────────────────────

  ajouterLieu(): void {
    if (!this.nouveauLibelle.trim()) return;
    const mappe = this.mapService.obtenirInstance();
    const centre = mappe?.getCenter();

    const lieu: LieuReference = {
      id: 'lieu-' + ++compteurId,
      libelle: this.nouveauLibelle.trim(),
      categorie: this.nouvelleCategorie,
      coordonnees: {
        latitude: centre?.lat ?? this.centre.latitude,
        longitude: centre?.lng ?? this.centre.longitude,
      },
      rayonMetres: 2000,
    };

    // On utilise les logements du viewport courant pour le calcul de proximité
    const logementsActuels = this.logements.length ? this.logements : this.logementsViewport();

    const resultat = this.mapService.afficherZoneProximite(
      lieu,
      logementsActuels.map((l) => ({ id: l.id, latitude: l.latitude, longitude: l.longitude })),
    );

    this.lieuxReference = [...this.lieuxReference, lieu];
    this.resultatsProximite = [...this.resultatsProximite, resultat];
    this.nouveauLibelle = '';
  }

  supprimerLieu(id: string): void {
    this.lieuxReference = this.lieuxReference.filter((l) => l.id !== id);
    this.resultatsProximite = this.resultatsProximite.filter((r) => r.lieuId !== id);
    if (this.lieuxReference.length === 0) this.mapService.masquerZoneProximite();
  }

  recentrer(): void {
    const logementsActuels = this.logements.length ? this.logements : this.logementsViewport();

    const points: PointCarte[] = logementsActuels.map((l) => ({
      id: l.id,
      coordonnees: { latitude: l.latitude, longitude: l.longitude },
      etiquette: '',
    }));
    this.mapService.cadrerSurPoints(points);
  }

  basculerPanneau(panneau: 'couches' | 'proximite'): void {
    this.panneauOuvert = this.panneauOuvert === panneau ? 'aucun' : panneau;
  }

  // ── Événements CustomEvent venant des popups MapLibre ─────────────────────

  @HostListener('window:kasa:filtrer-quartier', ['$event'])
  onFiltrerQuartier(event: Event): void {
    const quartierNom = (event as CustomEvent<string>).detail;
    this.filtrerParQuartier.emit(quartierNom);
  }

  @HostListener('window:kasa:zoom-ville', ['$event'])
  onZoomVille(event: Event): void {
    const villeId = (event as CustomEvent<string>).detail;
    const ville = this.villes.find((v) => v.id === villeId);
    if (ville) this.mapService.zoomerSurVille(ville);
  }

  // ── Privé ─────────────────────────────────────────────────────────────────

  /**
   * Lit le bbox courant de la carte MapLibre.
   * Retourne null si la carte n'est pas encore initialisée.
   */
  private obtenirBboxCourante(): FiltresLogement['bornesCarte'] | null {
    const mappe = this.mapService.obtenirInstance();
    if (!mappe) return null;
    const bounds = mappe.getBounds();
    return {
      nord: bounds.getNorth(),
      sud: bounds.getSouth(),
      est: bounds.getEast(),
      ouest: bounds.getWest(),
    };
  }

  /**
   * Charge les logements visibles dans le viewport courant.
   * Combine le bbox de la carte avec les filtres métier du parent.
   *
   * C'est ici que se matérialise l'architecture viewport-aware :
   * on ne demande jamais TOUS les logements, seulement ceux
   * qui correspondent à ce que l'utilisateur voit + ses filtres.
   */
  private rechargerLogementsViewport(bbox: FiltresLogement['bornesCarte']): void {
    this.chargementEnCours.set(true);

    const filtresCombines: FiltresLogement = {
      ...this.filtresMetier, // filtres de la barre (type, budget…)
      bornesCarte: bbox, // bbox de la carte (ce qui est visible)
    };

    this.logementService.obtenirLogements(filtresCombines).subscribe({
      next: (logements) => {
        this.logementsViewport.set(logements);
        this.chargementEnCours.set(false);
        this.mettreAJourMarqueursDepuisViewport(logements);
      },
      error: () => this.chargementEnCours.set(false),
    });
  }

  private mettreAJourMarqueurs(): void {
    // En mode @Input logements (pilotage par le parent)
    const points = this.logements.map((l) => this.logementEnPoint(l));
    this.mapService.afficherPoints(points);
  }

  private mettreAJourMarqueursDepuisViewport(logements: Logement[]): void {
    // En mode viewport autonome
    const points = logements.map((l) => this.logementEnPoint(l));
    this.mapService.afficherPoints(points);
  }

  private logementEnPoint(l: Logement): PointCarte {
    return {
      id: l.id,
      coordonnees: { latitude: l.latitude, longitude: l.longitude },
      etiquette: `${l.prix.toLocaleString('fr-FR')} ${l.devise}`,
      certifie: l.annonceCertifiee,
    };
  }

  private mettreAJourPointsInteret(): void {
    const poiActifs = this.couchesAffichage.filter((c) => c.actif).map((c) => c.categorie);
    this.mapService.afficherPointsInteret(POINTS_INTERET_OUAGA, new Set(poiActifs));
  }
}
