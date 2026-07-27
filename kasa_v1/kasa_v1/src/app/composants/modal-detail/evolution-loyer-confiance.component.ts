import {
  Component,
  Input,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartOptions, TooltipItem, registerables } from 'chart.js';

Chart.register(...registerables);

/** Un point d'historique de loyer, tel que stocké sur `Logement.historiquePrix`. */
export interface PointHistoriquePrix {
  date: string;
  prix: number;
  devise?: string;
  /** Raison de la variation : ex. "Quartier revalorisé", "Rénovation salle de bain"… */
  motif?: string;
  icone?: string;
}

/** Un point d'historique du score de confiance BBV. À ajouter sur `Logement.historiqueBBV`. */
export interface PointHistoriqueBBV {
  date: string;
  score: number;
  motif?: string;
  icone?: string;
}

type Onglet = 'prix' | 'bbv';

interface PointGraphe {
  label: string;
  valeur: number;
  evenement: { nom: string; icone: string } | null;
}

interface Marqueur {
  x: number;
  y: number;
  nom: string;
  icone: string;
}

const ORANGE = '#C1440E';
const ORANGE_FOND = 'rgba(193,68,14,0.10)';
const ORANGE_FOND_0 = 'rgba(193,68,14,0)';

@Component({
  selector: 'app-evolution-loyer-confiance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evolution-loyer-confiance.component.html',
  styleUrls: ['./evolution-loyer-confiance.component.css'],
})
export class EvolutionLoyerConfianceComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** Historique des loyers (déjà présent sur le modèle Logement). */
  @Input() historiquePrix: PointHistoriquePrix[] = [];
  /** Historique du score BBV (à ajouter sur le modèle Logement pour activer cet onglet). */
  @Input() historiqueBBV: PointHistoriqueBBV[] = [];
  @Input() devise = 'FCFA';

  @ViewChild('canvasPrix') canvasPrixRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasBbv') canvasBbvRef?: ElementRef<HTMLCanvasElement>;

  ongletActif: Onglet = 'prix';
  markersPrix: Marqueur[] = [];
  markersBbv: Marqueur[] = [];

  private chartPrix?: Chart;
  private chartBbv?: Chart;
  private vueInitialisee = false;

  get donneesPrix(): PointGraphe[] {
    return this.historiquePrix.map((h) => ({
      label: h.date,
      valeur: h.prix,
      evenement: h.motif ? { nom: h.motif, icone: h.icone ?? '📈' } : null,
    }));
  }

  get donneesBbv(): PointGraphe[] {
    return this.historiqueBBV.map((h) => ({
      label: h.date,
      valeur: h.score,
      evenement: h.motif ? { nom: h.motif, icone: h.icone ?? '✅' } : null,
    }));
  }

  get prixActuel(): number | null {
    const d = this.donneesPrix;
    return d.length ? d[d.length - 1].valeur : null;
  }

  get prixPic(): PointGraphe | null {
    return this.pointMax(this.donneesPrix);
  }

  get bbvActuel(): number | null {
    const d = this.donneesBbv;
    return d.length ? d[d.length - 1].valeur : null;
  }

  get bbvPic(): PointGraphe | null {
    return this.pointMax(this.donneesBbv);
  }

  changerOnglet(onglet: Onglet): void {
    if (this.ongletActif === onglet) return;
    this.ongletActif = onglet;
    // Le canvas caché par *ngIf n'a pas de taille tant qu'il n'est pas affiché :
    // on (re)construit son graphe une fois rendu dans le DOM.
    setTimeout(() => this.construireGrapheOnglet(onglet), 0);
  }

  ngAfterViewInit(): void {
    this.vueInitialisee = true;
    this.construireGrapheOnglet(this.ongletActif);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.vueInitialisee) return;
    if (changes['historiquePrix'] || changes['historiqueBBV']) {
      this.construireGrapheOnglet(this.ongletActif);
    }
  }

  ngOnDestroy(): void {
    this.chartPrix?.destroy();
    this.chartBbv?.destroy();
  }

  @HostListener('window:resize')
  surRedimensionnement(): void {
    setTimeout(() => {
      if (this.chartPrix)
        this.markersPrix = this.calculerMarqueurs(this.chartPrix, this.donneesPrix);
      if (this.chartBbv) this.markersBbv = this.calculerMarqueurs(this.chartBbv, this.donneesBbv);
    }, 50);
  }

  private construireGrapheOnglet(onglet: Onglet): void {
    if (onglet === 'prix' && this.canvasPrixRef && this.donneesPrix.length) {
      this.chartPrix?.destroy();
      this.chartPrix = this.creerGraphe(this.canvasPrixRef.nativeElement, this.donneesPrix, (v) =>
        this.formaterPrix(v),
      );
      setTimeout(() => {
        if (this.chartPrix)
          this.markersPrix = this.calculerMarqueurs(this.chartPrix, this.donneesPrix);
      }, 550);
    }
    if (onglet === 'bbv' && this.canvasBbvRef && this.donneesBbv.length) {
      this.chartBbv?.destroy();
      this.chartBbv = this.creerGraphe(
        this.canvasBbvRef.nativeElement,
        this.donneesBbv,
        (v) => this.formaterScore(v),
        4,
        10,
      );
      setTimeout(() => {
        if (this.chartBbv) this.markersBbv = this.calculerMarqueurs(this.chartBbv, this.donneesBbv);
      }, 550);
    }
  }

  private creerGraphe(
    canvas: HTMLCanvasElement,
    points: PointGraphe[],
    formateur: (v: number) => string,
    yMin?: number,
    yMax?: number,
  ): Chart {
    const ctx = canvas.getContext('2d')!;
    const hauteur = canvas.parentElement?.clientHeight || 220;
    const degrade = ctx.createLinearGradient(0, 0, 0, hauteur);
    degrade.addColorStop(0, ORANGE_FOND);
    degrade.addColorStop(1, ORANGE_FOND_0);

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeInOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(18,16,8,0.92)',
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const ev = points[items[0].dataIndex]?.evenement;
              return ev ? `${ev.icone} ${ev.nom}` : '';
            },
            label: (item: TooltipItem<'line'>) =>
              `${points[item.dataIndex].label} · ${formateur(item.parsed.y as number)}`,
          },
        },
      },
      scales: {
        x: { display: false, grid: { display: false } },
        y: {
          min: yMin,
          max: yMax,
          position: 'right',
          grid: { color: 'rgba(30,24,20,0.06)' },
          ticks: {
            maxTicksLimit: 4,
            color: '#6B6560',
            font: { size: 11 },
            callback: (v: string | number) => formateur(Number(v)),
          },
        },
      },
    };

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: points.map((p) => p.label),
        datasets: [
          {
            data: points.map((p) => p.valeur),
            borderColor: ORANGE,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: ORANGE,
            fill: true,
            backgroundColor: degrade,
            tension: 0.4,
          },
        ],
      },
      options,
    });
  }

  private calculerMarqueurs(chart: Chart, points: PointGraphe[]): Marqueur[] {
    const meta = chart.getDatasetMeta(0);
    const marqueurs: Marqueur[] = [];
    points.forEach((p, i) => {
      const pt = meta.data[i] as unknown as { x: number; y: number } | undefined;
      if (p.evenement && pt) {
        marqueurs.push({ x: pt.x, y: pt.y, nom: p.evenement.nom, icone: p.evenement.icone });
      }
    });
    return marqueurs;
  }

  private pointMax(points: PointGraphe[]): PointGraphe | null {
    if (!points.length) return null;
    return points.reduce((max, p) => (p.valeur > max.valeur ? p : max), points[0]);
  }

  formaterPrix(v: number): string {
    return Math.round(v / 1000) + 'k';
  }

  formaterScore(v: number): string {
    return v.toFixed(1) + '/10';
  }
}
