import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { BarreNavigationComponent } from "../barre-navigation/barre-navigation.component";

Chart.register(...registerables);

interface SerieIndice {
  periodes: string[];
  valeurs: number[];
  nbAnnonces: number;
}

type Quartier = 'karpala' | 'ouaga2000' | 'pattedoie' | 'gounghin' | 'zogona' | 'wemtenga';
type TypeBien = 'chambre' | 'studio' | 'appart' | 'minivilla';

const PERIODES = ['Jan–Avr 2024', 'Mai–Août 2024', 'Sep–Déc 2024', 'Jan–Avr 2025'];

const DONNEES: Record<Quartier, Record<TypeBien, SerieIndice>> = {
  karpala: {
    chambre:   { periodes: PERIODES, valeurs: [35000, 37000, 40000, 42000], nbAnnonces: 18 },
    studio:    { periodes: PERIODES, valeurs: [66000, 70000, 75000, 80000], nbAnnonces: 24 },
    appart:    { periodes: PERIODES, valeurs: [98000, 105000, 110000, 118000], nbAnnonces: 11 },
    minivilla: { periodes: PERIODES, valeurs: [155000, 163000, 172000, 182000], nbAnnonces: 7 },
  },
  ouaga2000: {
    chambre:   { periodes: PERIODES, valeurs: [55000, 58000, 63000, 68000], nbAnnonces: 22 },
    studio:    { periodes: PERIODES, valeurs: [95000, 103000, 112000, 122000], nbAnnonces: 31 },
    appart:    { periodes: PERIODES, valeurs: [178000, 192000, 208000, 222000], nbAnnonces: 15 },
    minivilla: { periodes: PERIODES, valeurs: [310000, 332000, 355000, 378000], nbAnnonces: 9 },
  },
  pattedoie: {
    chambre:   { periodes: PERIODES, valeurs: [43000, 46000, 49000, 52000], nbAnnonces: 14 },
    studio:    { periodes: PERIODES, valeurs: [75000, 80000, 85000, 91000], nbAnnonces: 19 },
    appart:    { periodes: PERIODES, valeurs: [130000, 140000, 150000, 158000], nbAnnonces: 10 },
    minivilla: { periodes: PERIODES, valeurs: [208000, 220000, 234000, 248000], nbAnnonces: 6 },
  },
  gounghin: {
    chambre:   { periodes: PERIODES, valeurs: [29000, 31000, 33000, 36000], nbAnnonces: 13 },
    studio:    { periodes: PERIODES, valeurs: [52000, 55000, 59000, 63000], nbAnnonces: 16 },
    appart:    { periodes: PERIODES, valeurs: [82000, 88000, 94000, 100000], nbAnnonces: 8 },
    minivilla: { periodes: PERIODES, valeurs: [138000, 147000, 156000, 165000], nbAnnonces: 5 },
  },
  zogona: {
    chambre:   { periodes: PERIODES, valeurs: [38000, 40000, 43000, 46000], nbAnnonces: 16 },
    studio:    { periodes: PERIODES, valeurs: [70000, 74000, 79000, 85000], nbAnnonces: 20 },
    appart:    { periodes: PERIODES, valeurs: [112000, 118000, 126000, 134000], nbAnnonces: 9 },
    minivilla: { periodes: PERIODES, valeurs: [175000, 185000, 195000, 208000], nbAnnonces: 6 },
  },
  wemtenga: {
    chambre:   { periodes: PERIODES, valeurs: [32000, 34000, 36000, 39000], nbAnnonces: 12 },
    studio:    { periodes: PERIODES, valeurs: [58000, 62000, 66000, 71000], nbAnnonces: 17 },
    appart:    { periodes: PERIODES, valeurs: [90000, 96000, 102000, 110000], nbAnnonces: 8 },
    minivilla: { periodes: PERIODES, valeurs: [148000, 157000, 167000, 178000], nbAnnonces: 5 },
  },
};

const NOM_QUARTIER: Record<Quartier, string> = {
  karpala: 'Karpala',
  ouaga2000: 'Ouaga 2000',
  pattedoie: "Patte d'Oie",
  gounghin: 'Gounghin',
  zogona: 'Zogona',
  wemtenga: 'Wemtenga',
};

const NOM_TYPE: Record<TypeBien, string> = {
  chambre: 'chambres',
  studio: 'studios',
  appart: 'appartements',
  minivilla: 'mini villas',
};

const ACCENT = '#00a84f';
const ACCENT_FOND = 'rgba(0,168,79,0.10)';
const ACCENT_FOND_0 = 'rgba(0,168,79,0)';

@Component({
  selector: 'app-indice-loyers',
  standalone: true,
  imports: [CommonModule, FormsModule, BarreNavigationComponent],
  templateUrl: './indice-loyers.component.html',
  styleUrls: ['./indice-loyers.component.css'],
})
export class IndiceLoyers implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  quartierSelectionne: Quartier = 'karpala';
  typeBienSelectionne: TypeBien = 'studio';

  /** Loyer proposé au locataire, saisi pour être comparé au marché. */
  loyerVerifie: number | null = null;

  readonly quartiers = Object.entries(NOM_QUARTIER) as [Quartier, string][];
  readonly typesBiens = Object.entries(NOM_TYPE) as [TypeBien, string][];

  private chart?: Chart;

  get serie(): SerieIndice {
    return DONNEES[this.quartierSelectionne][this.typeBienSelectionne];
  }

  get loyerActuel(): number {
    const v = this.serie.valeurs;
    return v[v.length - 1];
  }

  get loyerDebut(): number {
    return this.serie.valeurs[0];
  }

  get deltaPct(): number {
    return Math.round(((this.loyerActuel - this.loyerDebut) / this.loyerDebut) * 1000) / 10;
  }

  get deltaHausse(): boolean {
    return this.deltaPct >= 0;
  }

  get periodeActuelle(): string {
    const p = this.serie.periodes;
    return p[p.length - 1];
  }

  get nomQuartier(): string {
    return NOM_QUARTIER[this.quartierSelectionne];
  }

  get nomType(): string {
    return NOM_TYPE[this.typeBienSelectionne];
  }

  /** Forme au singulier (« studio » plutôt que « studios »). */
  get nomTypeSingulier(): string {
    return this.nomType.replace(/s$/, '');
  }

  get noteSource(): string {
    return (
      `Calculé à partir de ${this.serie.nbAnnonces} annonces KaSa vérifiées : ` +
      `${this.nomType} à ${this.nomQuartier}, sur 4 périodes de 4 mois ` +
      `(${this.serie.periodes[0]} – ${this.periodeActuelle}). Source : KaSa Données.`
    );
  }

  // ══ Vérificateur « Ce loyer est-il juste ? » ══════════════════════════════

  /** Écart en % entre le loyer proposé et la médiane du marché (>0 = plus cher). */
  get ecartPct(): number | null {
    if (!this.loyerVerifie || this.loyerVerifie <= 0) return null;
    return Math.round(((this.loyerVerifie - this.loyerActuel) / this.loyerActuel) * 1000) / 10;
  }

  /** Verdict qualitatif du loyer proposé vs marché. */
  get verdict(): 'bon' | 'marche' | 'eleve' | 'tres_eleve' | null {
    const e = this.ecartPct;
    if (e === null) return null;
    if (e <= -8) return 'bon';
    if (e <= 8) return 'marche';
    if (e <= 25) return 'eleve';
    return 'tres_eleve';
  }

  get verdictTitre(): string {
    switch (this.verdict) {
      case 'bon': return 'Bonne affaire';
      case 'marche': return 'Au prix du marché';
      case 'eleve': return 'Au-dessus du marché';
      case 'tres_eleve': return 'Nettement trop cher';
      default: return '';
    }
  }

  get verdictMessage(): string {
    const e = this.ecartPct;
    if (e === null) return '';
    const abs = Math.abs(e);
    const cible = `${this.nomType.replace(/s$/, '')} à ${this.nomQuartier}`;
    switch (this.verdict) {
      case 'bon':
        return `Ce loyer est ${abs} % en dessous de la médiane pour un ${cible}. C'est une bonne opportunité.`;
      case 'marche':
        return `Ce loyer correspond au prix médian du marché pour un ${cible} (écart ${e > 0 ? '+' : ''}${e} %).`;
      case 'eleve':
        return `Ce loyer est ${abs} % au-dessus de la médiane. Vous pouvez tenter de négocier vers ${this.formaterPrix(this.loyerActuel)}.`;
      default:
        return `Ce loyer est ${abs} % au-dessus de la médiane pour un ${cible}. Négociez fermement ou comparez d'autres quartiers.`;
    }
  }

  /** Position (0–100 %) du loyer proposé sur une échelle centrée sur la médiane (±40 %). */
  get positionGauge(): number {
    const e = this.ecartPct ?? 0;
    return Math.max(4, Math.min(96, 50 + (e * 50) / 40));
  }

  // ══ Comparateur de quartiers « Où payer moins ? » ═════════════════════════

  /** Médiane actuelle par quartier pour le type sélectionné, triée du - cher au + cher. */
  get comparaisonQuartiers(): {
    key: Quartier;
    nom: string;
    mediane: number;
    largeur: number;
    ecartVsSel: number;
    actif: boolean;
  }[] {
    const type = this.typeBienSelectionne;
    const lignes = (Object.keys(DONNEES) as Quartier[]).map((key) => {
      const v = DONNEES[key][type].valeurs;
      return { key, nom: NOM_QUARTIER[key], mediane: v[v.length - 1] };
    });
    const max = Math.max(...lignes.map((l) => l.mediane));
    const mediansSel = this.loyerActuel;
    return lignes
      .sort((a, b) => a.mediane - b.mediane)
      .map((l) => ({
        ...l,
        largeur: Math.round((l.mediane / max) * 100),
        ecartVsSel: Math.round(((l.mediane - mediansSel) / mediansSel) * 100),
        actif: l.key === this.quartierSelectionne,
      }));
  }

  get quartierLeMoinsCher(): { nom: string; mediane: number } {
    const c = this.comparaisonQuartiers[0];
    return { nom: c.nom, mediane: c.mediane };
  }

  /** Économie potentielle en changeant pour le quartier le moins cher (FCFA/mois). */
  get economieMax(): number {
    return Math.max(0, this.loyerActuel - this.quartierLeMoinsCher.mediane);
  }

  choisirQuartier(q: Quartier): void {
    this.quartierSelectionne = q;
    this.mettreAJourGraphe();
  }

  formaterPrix(v: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' FCFA';
  }

  onFiltreChange(): void {
    this.mettreAJourGraphe();
  }

  ngAfterViewInit(): void {
    this.construireGraphe();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private construireGraphe(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const hauteur = canvas.parentElement?.clientHeight || 220;
    const degrade = ctx.createLinearGradient(0, 0, 0, hauteur);
    degrade.addColorStop(0, ACCENT_FOND);
    degrade.addColorStop(1, ACCENT_FOND_0);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.serie.periodes,
        datasets: [
          {
            data: this.serie.valeurs,
            borderColor: ACCENT,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: ACCENT,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            fill: true,
            backgroundColor: degrade,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(20,24,28,0.92)',
            padding: 10,
            displayColors: false,
            callbacks: {
              title: (items) => items[0].label,
              label: (item) => '  ' + this.formaterPrix(item.parsed.y as number),
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#6b7075',
              font: { size: 11, family: 'Roboto' },
              maxRotation: 0,
            },
          },
          y: {
            position: 'right',
            grid: { color: 'rgba(20,24,28,0.06)' },
            border: { display: false },
            ticks: {
              maxTicksLimit: 4,
              color: '#6b7075',
              font: { size: 11, family: 'Roboto' },
              callback: (v) => Math.round(Number(v) / 1000) + 'k',
            },
          },
        },
      },
    });
  }

  private mettreAJourGraphe(): void {
    if (!this.chart) return;
    this.chart.data.labels = this.serie.periodes;
    this.chart.data.datasets[0].data = this.serie.valeurs;
    this.chart.update('active');
  }
}
