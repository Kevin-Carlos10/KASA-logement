import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BarreNavigationComponent } from '../barre-navigation/barre-navigation.component';

/** Raisons possibles d'une demande de soutien financier locataire. */
export type RaisonSoutien = 'charges' | 'avance' | 'caution' | 'ameublement';

interface OptionRaisonSoutien {
  valeur: RaisonSoutien;
  label: string;
}

/**
 * Page "Soutien logement" (accessible depuis la barre de navigation).
 * Permet au locataire de manifester un besoin d'accompagnement financier
 * (numéro, montant, raison) — aucun versement réel n'est effectué ici.
 */
@Component({
  selector: 'app-soutien',
  standalone: true,
  imports: [CommonModule, FormsModule, BarreNavigationComponent],
  templateUrl: './soutien.composant.html',
  styleUrls: ['./soutien.composant.css'],
})
export class SoutienComposant {
  readonly raisons: OptionRaisonSoutien[] = [
    { valeur: 'charges', label: 'Soutien pour les charges' },
    { valeur: 'avance', label: 'Avance' },
    { valeur: 'caution', label: 'Caution' },
    { valeur: 'ameublement', label: 'Ameublement' },
  ];

  // ── Modal ──
  afficherModalAide = false;

  // ── Formulaire ──
  formAideNumero = '';
  formAideRaison: RaisonSoutien = 'charges';
  formAideMontant: number | null = null;

  // ── Toast ──
  messageToast = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  get formulaireValide(): boolean {
    return !!this.formAideNumero?.trim() && !!this.formAideMontant && this.formAideMontant > 0;
  }

  ouvrirFormulaireAide(): void {
    this.afficherModalAide = true;
    document.body.style.overflow = 'hidden';
  }

  fermerFormulaireAide(): void {
    this.afficherModalAide = false;
    document.body.style.overflow = '';
  }

  soumettreDemandeAide(): void {
    if (!this.formulaireValide) return;
    // TODO: appel API pour enregistrer la demande (numéro, montant, raison) dans la
    // liste d'attente/qualification du futur dispositif d'accompagnement financier.
    // Aucun versement réel n'est effectué à ce stade.
    console.log('Demande de soutien manifestée', {
      numero: this.formAideNumero,
      montant: this.formAideMontant,
      raison: this.formAideRaison,
    });
    this.afficherToast(
      '✅ Votre demande a bien été enregistrée. Nous vous recontacterons dès que possible.',
    );
    this.reinitialiserFormulaire();
    this.fermerFormulaireAide();
  }

  private reinitialiserFormulaire(): void {
    this.formAideNumero = '';
    this.formAideRaison = 'charges';
    this.formAideMontant = null;
  }

  afficherToast(message: string): void {
    this.messageToast = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.messageToast = ''), 2800);
  }

  @HostListener('document:keydown.escape')
  surEchap(): void {
    if (this.afficherModalAide) this.fermerFormulaireAide();
  }
}