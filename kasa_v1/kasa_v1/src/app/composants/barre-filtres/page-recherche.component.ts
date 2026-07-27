/**
 * Exemple de composant page principale KaSa.
 *
 * Ce composant orchestre la connexion entre :
 *   - BarreFiltresComponent  → émet les filtres métier
 *   - MapComponent  → émet le bbox courant + les sélections
 *   - ListeLogements → reçoit les logements filtrés
 *
 * Flux de données :
 *
 *   BarreFiltresComponent
 *       │  (filtresChanges)
 *       ▼
 *   filtresMetier ──────────────► MapComponent
 *                                     │  (viewportChange)
 *                                     ▼
 *                               bornesCarte
 *                                     │
 *                                     ▼
 *                            LogementService
 *                         .obtenirLogements(filtres + bbox)
 *                                     │
 *                                     ▼
 *                              logements$ ──► ListeLogements
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { switchMap, BehaviorSubject, combineLatest, tap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { MapComponent } from '../map/map.component';
import { BarreFiltresComponent } from '../barre-filtres/barre-filtres.component';
import { FiltreState } from '../../models/filtre.model';
import { FiltresLogement, TypeBien } from '../../models/logement.model';
import { LogementService } from '../../services/logement.service';

@Component({
  selector: 'app-page-recherche',
  standalone: true,
  imports: [CommonModule, MapComponent, BarreFiltresComponent],
  template: `
    <div class="page-recherche">
      <!-- Barre de filtres -->
      <app-barre-filtres (filtresChanges)="onFiltresChanges($event)" />

      <!-- Layout carte + liste -->
      <div class="conteneur-principal">
        <!-- Carte : autonome, pilotée par les filtres + son viewport -->
        <app-map
          [filtresMetier]="filtresMetierCourants()"
          (viewportChange)="onViewportChange($event)"
          (logementSelectionne)="onLogementSelectionne($event)"
          (filtrerParQuartier)="onFiltrerParQuartier($event)"
        />

        <!-- Liste : reçoit les logements chargés par la carte -->
        <div class="liste-logements">
          <div *ngIf="chargement()" class="chargement">Chargement…</div>
          <div *ngFor="let logement of logements()" class="carte-logement">
            <!-- Votre LogementComponent ici -->
            {{ logement.quartier }} — {{ logement.prix | number }} {{ logement.devise }}
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PageRechercheComponent {
  private readonly logementService = inject(LogementService);

  // ── État ────────────────────────────────────────────────────────────────

  /** Filtres métier venant de la barre (type, budget, quartier) */
  readonly filtresMetierCourants = signal<FiltresLogement>({});

  /**
   * Bbox courant venant de la carte.
   * On initialise avec le bbox de Ouagadougou pour que combineLatest
   * émette immédiatement au démarrage sans attendre un moveend.
   */
  private readonly bbox$ = new BehaviorSubject<FiltresLogement['bornesCarte']>({
    nord: 12.45,
    sud: 12.28,
    est: -1.44,
    ouest: -1.6,
  });

  /** Filtres métier en stream */
  private readonly filtresMetier$ = new BehaviorSubject<FiltresLogement>({});

  readonly chargement = signal(false);

  /**
   * Les logements sont recalculés chaque fois que :
   *   - les filtres métier changent (barre de filtres)
   *   - le bbox change (déplacement de la carte)
   *
   * combineLatest garantit qu'on a toujours les deux avant de lancer
   * la requête.
   */
  private readonly logements$ = combineLatest([this.filtresMetier$, this.bbox$]).pipe(
    switchMap(([filtres, bbox]) => {
      this.chargement.set(true);
      return this.logementService.obtenirLogements({ ...filtres, bornesCarte: bbox });
    }),
    tap(() => this.chargement.set(false)),
  );

  readonly logements = toSignal(this.logements$, { initialValue: [] });

  // ── Handlers ────────────────────────────────────────────────────────────

  onFiltresChanges(etat: FiltreState): void {
    // Conversion FiltreState → FiltresLogement
    const filtres: FiltresLogement = {};

    if (etat.budget === 'Moins de 35k') filtres.prixMax = 35000;
    if (etat.budget === '35k - 60k') filtres.prixMax = 60000;
    if (etat.budget === '60k - 100k') filtres.prixMax = 100000;

    if (etat.type) {
      // Mapping des libellés UI vers les TypeBien du modèle
      const mapType: Record<string, TypeBien> = {
        'Chambre salon': 'Chambre',
        '2 chambres salon': 'Appartement',
        '3 chambres salon': 'Appartement',
        Appartement: 'Appartement',
        Villa: 'Villa',
        Duplex: 'Villa',
      };
      filtres.typeBien = mapType[etat.type];
    }

    if (etat.texte) filtres.texte = etat.texte;

    this.filtresMetierCourants.set(filtres);
    this.filtresMetier$.next(filtres);
  }

  onViewportChange(bbox: FiltresLogement['bornesCarte']): void {
    // La carte communique son nouveau bbox → on relance le chargement
    this.bbox$.next(bbox);
  }

  onLogementSelectionne(id: string): void {
    // Point d'intégration : ouvrir le détail du logement (ex. navigation vers /logement/:id)
  }

  onFiltrerParQuartier(quartierNom: string): void {
    // L'utilisateur a cliqué "Rechercher dans ce quartier" dans la popup
    // → on relance la recherche avec le nom du quartier comme texte libre
    const etatActuel = this.filtresMetierCourants();
    const filtres: FiltresLogement = { ...etatActuel, texte: quartierNom };
    this.filtresMetierCourants.set(filtres);
    this.filtresMetier$.next(filtres);
  }
}
