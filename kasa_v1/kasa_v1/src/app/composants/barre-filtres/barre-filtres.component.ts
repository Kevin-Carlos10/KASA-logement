import {
  Component,
  inject,
  signal,
  output,
  HostListener,
  computed,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiltresService } from '../../services/filtres.service';
import { FILTRE_STATE_INITIAL, FiltreState } from '../../models/filtre.model';

type DropdownId = 'quartier' | 'type' | 'budget' | null;

@Component({
  selector: 'app-barre-filtres',
  imports: [CommonModule, FormsModule],
  templateUrl: './barre-filtres.component.html',
  styleUrl: './barre-filtres.component.css',
})
export class BarreFiltresComponent {
  private svc = inject(FiltresService);

  readonly quartiers = this.svc.quartiers;
  readonly typeOptions = this.svc.typeLogement;
  readonly budgets = this.svc.budgets;

  etat = signal<FiltreState>({ ...FILTRE_STATE_INITIAL });
  dropdownOuvert = signal<DropdownId>(null);
  gpsEnCours = signal(false);
  rechercheOuverteMobile = signal(false);

  @ViewChild('rechercheInput') rechercheInputRef?: ElementRef<HTMLInputElement>;

  readonly filtresChanges = output<FiltreState>();
  readonly trierParProximite = output<GeolocationPosition | null>();

  readonly nbFiltresActifs = computed(
    () => [this.etat().quartier, this.etat().type, this.etat().budget].filter(Boolean).length,
  );

  onRecherche(valeur: string): void {
    this.patch({ recherche: valeur });
  }

  toggleRechercheMobile(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOuvert.set(null);
    this.rechercheOuverteMobile.update((v) => !v);
    if (this.rechercheOuverteMobile()) {
      setTimeout(() => this.rechercheInputRef?.nativeElement.focus());
    }
  }

  fermerRechercheMobile(event: MouseEvent): void {
    event.stopPropagation();
    this.rechercheOuverteMobile.set(false);
  }

  toggleDropdown(id: DropdownId, event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOuvert.update((c) => (c === id ? null : id));
  }

  isOpen(id: DropdownId): boolean {
    return this.dropdownOuvert() === id;
  }

  selectionnerQuartier(v: string): void {
    this.patch({ quartier: this.etat().quartier === v ? null : v });
    this.dropdownOuvert.set(null);
  }

  selectionnerType(v: string): void {
    this.patch({ type: this.etat().type === v ? null : v });
    this.dropdownOuvert.set(null);
  }

  selectionnerBudget(v: string): void {
    this.patch({ budget: this.etat().budget === v ? null : v });
    this.dropdownOuvert.set(null);
  }

  toggleProximite(): void {
    if (this.etat().proximite) {
      this.patch({ proximite: false });
      this.trierParProximite.emit(null);
      return;
    }
    if (!navigator.geolocation) {
      alert('Géolocalisation non supportée.');
      return;
    }
    this.gpsEnCours.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.gpsEnCours.set(false);
        this.patch({ proximite: true });
        this.trierParProximite.emit(pos);
      },
      () => {
        this.gpsEnCours.set(false);
        alert('Position inaccessible.');
      },
    );
  }

  reinitialiser(): void {
    this.etat.set({ ...FILTRE_STATE_INITIAL });
    this.dropdownOuvert.set(null);
    this.filtresChanges.emit(this.etat());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('.filtre-btn-wrapper')) {
      this.dropdownOuvert.set(null);
    }
    if (!(e.target as HTMLElement).closest('.recherche-wrapper')) {
      this.rechercheOuverteMobile.set(false);
    }
  }

  private patch(partial: Partial<FiltreState>): void {
    this.etat.update((s) => ({ ...s, ...partial }));
    this.filtresChanges.emit(this.etat());
  }
}
