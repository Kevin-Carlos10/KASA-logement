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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MapService } from '../../services/map.service';
import { Logement } from '../../models/logement.model';
import {
  CategorieProximite,
  CoucheAffichage,
  FondDeCarte,
  LieuReference,
  NiveauZone,
  PointCarte,
  PointInteret,
  POINTS_INTERET_OUAGA,
  QUARTIERS_OUAGADOUGOU,
  ResultatProximite,
  VILLES_BURKINA,
  ZoneQuartier,
  ZoneVille,
} from '../../models/map.model';

/** Icônes emoji par catégorie de proximité */
const ICONES_CATEGORIE: Record<CategorieProximite, string> = {
  travail:    '💼',
  universite: '🎓',
  ecole:      '🏫',
  hopital:    '🏥',
  marche:     '🛒',
  autre:      '📍',
};

const LABELS_CATEGORIE: Record<CategorieProximite, string> = {
  travail:    'Lieu de travail',
  universite: 'Université',
  ecole:      'École',
  hopital:    'Hôpital',
  marche:     'Marché',
  autre:      'Autre lieu',
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
  /** Logements à afficher comme marqueurs */
  @Input() logements: Logement[] = [];

  /** Points d'intérêt fournis par le parent (optionnel) */
  @Input() pointsInteret: PointInteret[] = [];

  /** Centre et zoom initiaux */
  @Input() centre = { latitude: 12.3714, longitude: -1.5197 };
  @Input() zoom = 12;

  /** Mode léger pour le modal-detail (sans contrôles de zones) */
  @Input() modeMini = false;

  /** Émis quand l'utilisateur clique sur un logement */
  @Output() logementSelectionne = new EventEmitter<string>();

  /** Émis quand l'utilisateur filtre par quartier via la popup */
  @Output() filtrerParQuartier = new EventEmitter<string>();

  @ViewChild('conteneurCarte', { static: true }) conteneurCarte!: ElementRef<HTMLDivElement>;

  // ── État interne ──
  fondCourant: FondDeCarte = 'plan';
  niveauZone: NiveauZone = 'quartier';
  panneauOuvert: 'aucun' | 'couches' | 'proximite' = 'aucun';

  // Couches POI
  couchesAffichage: CoucheAffichage[] = [
    { categorie: 'hopital',    label: 'Hôpitaux',     couleur: '#e8552d', actif: false },
    { categorie: 'universite', label: 'Universités',  couleur: '#5c5c5c', actif: false },
    { categorie: 'ecole',      label: 'Écoles',       couleur: '#C1440E', actif: false },
    { categorie: 'marche',     label: 'Marchés',      couleur: '#2f8f4e', actif: false },
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
  readonly categoriesProximite: CategorieProximite[] = ['travail', 'universite', 'ecole', 'hopital', 'marche', 'autre'];
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

  constructor(private readonly mapService: MapService) {
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

      this.abonnements.push(
        this.mapService.selection$.subscribe((sel) => {
          if (sel.type === 'point') this.logementSelectionne.emit(sel.id);
          if (sel.type === 'quartier') this.filtrerParQuartier.emit(sel.id);
        }),
        this.mapService.niveauZone$.subscribe((n) => (this.niveauZone = n)),
      );
    });
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (!this.carteInitialisee) return;
    if (ch['logements']) this.mettreAJourMarqueurs();
    if (ch['pointsInteret']) this.mettreAJourPointsInteret();
  }

  ngOnDestroy(): void {
    this.abonnements.forEach((s) => s.unsubscribe());
    this.mapService.detruireCarte();
  }

  // ════════ Fond de carte ════════

  changerFond(fond: FondDeCarte): void {
    this.fondCourant = fond;
    this.mapService.changerFondDeCarte(fond);
  }

  // ════════ Couches POI ════════

  basculerCouche(couche: CoucheAffichage): void {
    couche.actif = !couche.actif;
    this.mettreAJourPointsInteret();
  }

  // ════════ Zones géographiques ════════

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

  // ════════ Proximité ════════

  ajouterLieu(): void {
    if (!this.nouveauLibelle.trim()) return;
    const mappe = this.mapService.obtenirInstance();
    const centre = mappe?.getCenter();

    const lieu: LieuReference = {
      id: 'lieu-' + (++compteurId),
      libelle: this.nouveauLibelle.trim(),
      categorie: this.nouvelleCategorie,
      // Utiliser le centre courant de la carte comme position (à remplacer par géocodage)
      coordonnees: {
        latitude: centre?.lat ?? this.centre.latitude,
        longitude: centre?.lng ?? this.centre.longitude,
      },
      rayonMetres: 2000,
    };

    const resultat = this.mapService.afficherZoneProximite(
      lieu,
      this.logements.map((l) => ({ id: l.id, latitude: l.latitude, longitude: l.longitude })),
    );

    this.lieuxReference = [...this.lieuxReference, lieu];
    this.resultatsProximite = [...this.resultatsProximite, resultat];
    this.nouveauLibelle = '';
  }

  supprimerLieu(id: string): void {
    this.lieuxReference = this.lieuxReference.filter((l) => l.id !== id);
    this.resultatsProximite = this.resultatsProximite.filter((r) => r.lieuId !== id);
    if (this.lieuxReference.length === 0) {
      this.mapService.masquerZoneProximite();
    }
  }

  recentrer(): void {
    const points: PointCarte[] = this.logements.map((l) => ({
      id: l.id,
      coordonnees: { latitude: l.latitude, longitude: l.longitude },
      etiquette: '',
    }));
    this.mapService.cadrerSurPoints(points);
  }

  basculerPanneau(panneau: 'couches' | 'proximite'): void {
    this.panneauOuvert = this.panneauOuvert === panneau ? 'aucun' : panneau;
  }

  // ════════ Privé ════════

  private mettreAJourMarqueurs(): void {
    const points: PointCarte[] = this.logements.map((l) => ({
      id: l.id,
      coordonnees: { latitude: l.latitude, longitude: l.longitude },
      etiquette: `${l.prix.toLocaleString('fr-FR')} ${l.devise}`,
      certifie: l.annonceCertifiee,
    }));
    this.mapService.afficherPoints(points);
  }

  private mettreAJourPointsInteret(): void {
    const poiActifs = this.couchesAffichage.filter((c) => c.actif).map((c) => c.categorie);
    const source = this.pointsInteret.length ? this.pointsInteret : POINTS_INTERET_OUAGA;
    this.mapService.afficherPointsInteret(source, new Set(poiActifs));
  }

@HostListener('window:kasa:filtrer-quartier', ['$event'])
filtrerQuartier(event: Event) {
  const customEvent = event as CustomEvent;

  const quartier = customEvent.detail;

  console.log(quartier);
}


@HostListener('window:kasa:zoom-ville', ['$event'])
zoomVille(event: Event) {
  const customEvent = event as CustomEvent;

  const ville = customEvent.detail;

  console.log(ville);
}
}