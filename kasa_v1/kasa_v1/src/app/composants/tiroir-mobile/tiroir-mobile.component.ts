import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Logement } from '../../models/logement.model';

/**
 * Feuille du bas (bottom sheet) affichée sur mobile quand un marqueur
 * de carte est sélectionné. Affiche un aperçu rapide du logement.
 * Un clic sur "Voir le détail" émet l'événement `voirDetail`.
 */
@Component({
  selector: 'app-tiroir-mobile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tiroir-mobile.component.html',
  styleUrls: ['./tiroir-mobile.component.css'],
})
export class TiroirMobileComponent {
  @Input() logement: Logement | null = null;
  @Output() fermer = new EventEmitter<void>();
  @Output() voirDetail = new EventEmitter<Logement>();

  surVoirDetail(): void {
    if (this.logement) {
      this.voirDetail.emit(this.logement);
    }
  }
}
