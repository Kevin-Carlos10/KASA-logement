import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Logement } from '../../models/logement.model';

@Component({
  selector: 'app-logement',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logement.component.html',
  styleUrls: ['./logement.component.css'],
})
export class LogementComponent {
  @Input({ required: true }) logement!: Logement;

  /** Mis en surbrillance quand le marqueur correspondant est sélectionné sur la carte */
  @Input() estSurvole = false;

  /** Reflète l'état "enregistré" (favoris) géré par le parent */
  @Input() estEnregistre = false;

  @Output() carteSurvolee = new EventEmitter<string>();
  @Output() carteCliquee = new EventEmitter<string>();

  /** Émis quand l'utilisateur clique sur "Enregistrer" / "Retirer des favoris" */
  @Output() logementEnregistre = new EventEmitter<string>();
  /** Émis quand l'utilisateur clique sur "Masquer cette annonce" */
  @Output() logementMasque = new EventEmitter<string>();
  /** Émis quand l'utilisateur clique sur "Signaler l'annonce" */
  @Output() logementSignale = new EventEmitter<string>();

  indexImageCourante = 0;
  menuOuvert = false;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  /** Ferme le menu si l'utilisateur clique en dehors de la carte */
  @HostListener('document:click', ['$event'])
  surClicDocument(evenement: MouseEvent): void {
    if (this.menuOuvert && !this.elementRef.nativeElement.contains(evenement.target as Node)) {
      this.menuOuvert = false;
    }
  }

  basculerMenu(evenement: MouseEvent): void {
    evenement.stopPropagation();
    this.menuOuvert = !this.menuOuvert;
  }

  surEnregistrer(evenement: MouseEvent): void {
    evenement.stopPropagation();
    this.menuOuvert = false;
    this.logementEnregistre.emit(this.logement.id);
  }

  surMasquer(evenement: MouseEvent): void {
    evenement.stopPropagation();
    this.menuOuvert = false;
    this.logementMasque.emit(this.logement.id);
  }

  imageSuivante(evenement: MouseEvent): void {
    evenement.stopPropagation();
    this.indexImageCourante = (this.indexImageCourante + 1) % this.logement.images.length;
  }

  imagePrecedente(evenement: MouseEvent): void {
    evenement.stopPropagation();
    this.indexImageCourante =
      (this.indexImageCourante - 1 + this.logement.images.length) % this.logement.images.length;
  }

  allerAImage(index: number, evenement: MouseEvent): void {
    evenement.stopPropagation();
    this.indexImageCourante = index;
  }

  onSurvol(): void {
    this.carteSurvolee.emit(this.logement.id);
  }

  onClic(): void {
    this.carteCliquee.emit(this.logement.id);
  }

  formaterPrix(): string {
    return `${this.logement.prix.toLocaleString('fr-FR')} ${this.logement.devise}`;
  }

  formaterDistance(): string {
    const km = this.logement.distanceKm;
    return km < 1 ? `À ${Math.round(km * 1000)} m` : `À ${km.toLocaleString('fr-FR')} km`;
  }
}
