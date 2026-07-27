import { Component, computed, effect, signal, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LogementService } from '../../services/logement.service';
import { Logement } from '../../models/logement.model';
import { BarreNavigationComponent } from '../barre-navigation/barre-navigation.component';

/**
 * Simulateur de budget (PDF section 8 — Outils financiers pour le locataire).
 *
 * Inspiré du « Rent Affordability Calculator » d'Apartments.com :
 * - curseur interactif pour la part du revenu consacrée au loyer (10 → 50 %),
 * - budget loyer recalculé EN DIRECT au glissement du curseur,
 * - répartition budgétaire 50/30/20 (essentielles / courantes / épargne),
 * - annonces correspondantes suggérées en temps réel depuis l'API.
 */
@Component({
  selector: 'app-simulateur-budget',
  standalone: true,
  imports: [CommonModule, FormsModule, BarreNavigationComponent],
  templateUrl: './simulateur-budget.component.html',
  styleUrls: ['./simulateur-budget.component.css'],
})
export class SimulateurBudgetComponent {
  // ── Entrées ────────────────────────────────────────────────────────────────
  readonly revenuMensuel = signal<number | null>(null);
  /** Part du revenu consacrée au loyer (%). Défaut : 30 %, seuil communément admis. */
  readonly pourcentage = signal(30);
  /** Quartier de préférence du locataire ('' = tous les quartiers). */
  readonly quartier = signal<string>('');

  /** Quartiers disponibles pour le sélecteur. */
  readonly quartiers = signal<string[]>([]);

  // ── Résultats live ──────────────────────────────────────────────────────────
  /** Budget loyer = revenu × pourcentage, arrondi au millier. */
  readonly loyerBudget = computed(() => this.arrondi(this.revenu() * (this.pourcentage() / 100)));

  /** Répartition 50/30/20 du revenu mensuel. */
  readonly depensesEssentielles = computed(() => this.arrondi(this.revenu() * 0.5));
  readonly depensesCourantes = computed(() => this.arrondi(this.revenu() * 0.3));
  readonly epargne = computed(() => this.arrondi(this.revenu() * 0.2));

  /**
   * Niveau de confort du loyer choisi :
   * - 'ok'      ≤ 30 % : recommandé,
   * - 'limite'  30–40 % : à surveiller,
   * - 'risque'  > 40 % : risque de surendettement.
   */
  readonly niveau = computed<'ok' | 'limite' | 'risque'>(() => {
    const p = this.pourcentage();
    if (p <= 30) return 'ok';
    if (p <= 40) return 'limite';
    return 'risque';
  });

  /** Part occupée par le loyer dans la barre d'allocation (bornée à 100 %). */
  readonly partLoyer = computed(() => Math.min(this.pourcentage(), 100));

  // ── Suggestions d'annonces (backend, débounce) ───────────────────────────────
  readonly suggestions = signal<Logement[]>([]);
  readonly recherche = signal(false);

  private minuteur: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private logementSvc: LogementService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    // Recharge les annonces (débouncé) chaque fois que le budget OU le quartier change.
    effect(() => {
      const budget = this.loyerBudget();
      const quartier = this.quartier();
      if (!isPlatformBrowser(this.platformId)) return;
      if (budget <= 0) {
        this.suggestions.set([]);
        return;
      }
      this.planifierRecherche(budget, quartier);
    });

    // Liste des quartiers pour le sélecteur (une seule fois, côté navigateur).
    if (isPlatformBrowser(this.platformId)) {
      this.logementSvc.obtenirQuartiers().subscribe((qs) => this.quartiers.set(qs));
    }
  }

  private revenu(): number {
    const r = this.revenuMensuel();
    return r && r > 0 ? r : 0;
  }

  private arrondi(v: number): number {
    return Math.round(v / 1000) * 1000;
  }

  private planifierRecherche(budget: number, quartier: string): void {
    if (this.minuteur) clearTimeout(this.minuteur);
    this.recherche.set(true);
    this.minuteur = setTimeout(() => {
      this.logementSvc
        .obtenirLogements({ prixMax: budget, quartier: quartier || undefined })
        .subscribe((logements) => {
          this.suggestions.set(
            logements
              .filter((l) => l.prix <= budget)
              .sort((a, b) => b.prix - a.prix)
              .slice(0, 4),
          );
          this.recherche.set(false);
        });
    }, 300);
  }

  fmt(v: number): string {
    return v.toLocaleString('fr-FR');
  }

  allerAuxLogements(): void {
    this.router.navigate(['/home']);
  }

  reinitialiser(): void {
    this.revenuMensuel.set(null);
    this.pourcentage.set(30);
    this.quartier.set('');
    this.suggestions.set([]);
  }
}
