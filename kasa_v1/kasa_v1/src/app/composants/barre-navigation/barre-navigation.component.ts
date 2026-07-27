import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-barre-navigation',
  imports: [CommonModule, RouterModule],
  templateUrl: './barre-navigation.component.html',
  styleUrl: './barre-navigation.component.css',
})
export class BarreNavigationComponent {
  menuOuvert = false;
  servicesOuvert = false;
  servicesMobileEtendu = false;
  menuUtilisateurOuvert = false;
  popoverStyle: { [key: string]: string } = {};

  @ViewChild('badgeWrapper') badgeWrapper?: ElementRef<HTMLElement>;
  @ViewChild('userMenuRef') userMenuRef?: ElementRef<HTMLElement>;

  services = [
    { label: 'Mon contrat de bail', icon: 'description' },
    { label: 'État des lieux', icon: 'fact_check' },
    { label: 'Payer mon loyer', icon: 'payments' },
    { label: 'Ma caution épargnée', icon: 'savings' },
    { label: 'Prêt immobilier', icon: 'account_balance' },
    { label: 'Mon score locataire', icon: 'stars' },
    { label: 'Mes commentaires', icon: 'reviews' },
    { label: 'Signaler un problème', icon: 'report_problem' },
    { label: 'Contacter un artisan', icon: 'construction' },
    { label: 'Prendre une visite', icon: 'event' },
    { label: 'Recommandations IA', icon: 'smart_toy' },
  ];

  constructor(readonly auth: AuthService) {}

  get utilisateur() {
    return this.auth.utilisateur();
  }
  get estConnecte() {
    return this.auth.estConnecte();
  }

  get libelleRole(): string {
    switch (this.utilisateur?.role) {
      case 'gerant':
        return 'Gérant';
      case 'artisan':
        return 'Artisan';
      case 'locataire':
        return 'Locataire';
      default:
        return '';
    }
  }

  get servicesApercuMobile() {
    return this.services.slice(0, 4);
  }
  get servicesRestants() {
    return this.services.length - 4;
  }

  toggleMenu() {
    this.menuOuvert = !this.menuOuvert;
    document.body.style.overflowX = this.menuOuvert ? 'hidden' : '';
  }

  toggleServices(event: Event) {
    event.stopPropagation();
    this.servicesOuvert = !this.servicesOuvert;
    if (this.servicesOuvert) this.updatePopoverPosition();
  }

  closeServices() {
    this.servicesOuvert = false;
  }

  toggleServicesMobile() {
    this.servicesMobileEtendu = !this.servicesMobileEtendu;
  }

  toggleMenuUtilisateur(event: Event) {
    event.stopPropagation();
    this.menuUtilisateurOuvert = !this.menuUtilisateurOuvert;
  }

  closeMenuUtilisateur() {
    this.menuUtilisateurOuvert = false;
  }

  ouvrirConnexion() {
    this.auth.ouvrirModal('connexion');
    this.menuOuvert = false;
  }

  ouvrirInscription() {
    this.auth.ouvrirModal('inscription');
    this.menuOuvert = false;
  }

  deconnecter() {
    this.auth.deconnecter();
    this.menuUtilisateurOuvert = false;
    this.menuOuvert = false;
  }

  private updatePopoverPosition() {
    if (!this.badgeWrapper) return;
    const rect = this.badgeWrapper.nativeElement.getBoundingClientRect();
    const popoverWidth = 380;
    const marge = 12;
    let left = rect.right - popoverWidth;
    if (left < marge) left = marge;
    const maxLeft = window.innerWidth - popoverWidth - marge;
    if (left > maxLeft) left = maxLeft;
    this.popoverStyle = {
      position: 'fixed',
      top: `${rect.bottom + 10}px`,
      left: `${left}px`,
    };
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      this.menuUtilisateurOuvert &&
      this.userMenuRef &&
      !this.userMenuRef.nativeElement.contains(target)
    ) {
      this.menuUtilisateurOuvert = false;
    }
    if (this.servicesOuvert) this.closeServices();
  }

  @HostListener('window:resize')
  onResize() {
    if (this.servicesOuvert) this.closeServices();
  }

  @HostListener('window:scroll')
  onScroll() {
    if (this.servicesOuvert) this.closeServices();
  }
}
