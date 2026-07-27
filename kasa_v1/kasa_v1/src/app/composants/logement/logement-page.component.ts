import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Logement } from '../../models/logement.model';
import { MapComponent } from '../map/map.component';
import { LogementComponent } from './logement.component';
import { LogementService } from '../../services/logement.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { TiroirMobileComponent } from '../tiroir-mobile/tiroir-mobile.component';
import { BarreFiltresComponent } from '../barre-filtres/barre-filtres.component';
import { BarreNavigationComponent } from '../barre-navigation/barre-navigation.component';

@Component({
  selector: 'app-logements-page',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    LogementComponent,
    BarreFiltresComponent,
    TiroirMobileComponent,
    BarreNavigationComponent,
  ],
  templateUrl: './logement-page.component.html',
  styleUrls: ['./logement-page.component.css'],
})
export class LogementsPageComponent implements OnInit {
  logements: Logement[] = [];
  chargementEnCours = false;
  idLogementSurvole: string | null = null;
  logementTiroir: Logement | null = null;

  messageToast: string | null = null;
  toastAnnulable: (() => void) | null = null;
  private minuteurToast?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly logementService: LogementService,
    private readonly router: Router,
    readonly auth: AuthService,
  ) {}

  /** Liste des favoris depuis le service auth */
  get idsEnregistres(): Set<string> {
    const favoris = this.auth.utilisateur()?.favoris ?? [];
    return new Set(favoris);
  }

  /** Logements masqués par l'utilisateur connecté */
  private get idsMasquesAuth(): Set<string> {
    const masques = this.auth.utilisateur()?.logementsMasques ?? [];
    return new Set(masques);
  }

  get logementsAffiches(): Logement[] {
    return this.logements.filter((l) => !this.idsMasquesAuth.has(l.id));
  }

  ngOnInit(): void {
    this.logementService.obtenirLogements().subscribe((logements) => {
      this.logements = logements;
      this.chargementEnCours = false;
    });
  }

  @HostListener('document:keydown.escape')
  surEchap(): void {
    if (this.logementTiroir) this.fermerTiroir();
  }

  surMarqueurSelectionne(id: string): void {
    const logement = this.logements.find((l) => l.id === id);
    if (!logement) return;
    if (window.innerWidth < 768) {
      this.logementTiroir = logement;
    } else {
      this.ouvrirDetail(logement);
    }
  }

  surCarteSurvolee(id: string): void {
    this.idLogementSurvole = id;
  }

  ouvrirDetail(logement: Logement): void {
    this.logementTiroir = null;
    this.router.navigate(['/logement', logement.id]);
  }

  fermerTiroir(): void {
    this.logementTiroir = null;
  }

  surEnregistrer(id: string): void {
    if (!this.auth.estConnecte()) {
      this.auth.ouvrirModal('connexion');
      this.afficherToast('Connectez-vous pour enregistrer des favoris');
      return;
    }
    const action = this.auth.basculerFavori(id);
    if (action === 'ajoute') {
      this.afficherToast('✓ Annonce enregistrée dans vos favoris');
    } else if (action === 'retire') {
      this.afficherToast('Annonce retirée de vos favoris');
    }
  }

  surMasquer(id: string): void {
    if (!this.auth.estConnecte()) {
      this.auth.ouvrirModal('connexion');
      return;
    }
    this.auth.masquer(id);
    this.afficherToast('Annonce masquée', () => this.auth.demasquer(id));
  }

  surSignaler(id: string): void {
    if (!this.auth.estConnecte()) {
      this.auth.ouvrirModal('connexion');
      this.afficherToast('Connectez-vous pour signaler une annonce');
      return;
    }
    this.afficherToast('Signalement envoyé, merci pour votre vigilance');
  }

  annulerAction(): void {
    this.toastAnnulable?.();
    clearTimeout(this.minuteurToast);
    this.messageToast = null;
    this.toastAnnulable = null;
  }

  private afficherToast(message: string, surAnnuler?: () => void): void {
    clearTimeout(this.minuteurToast);
    this.messageToast = message;
    this.toastAnnulable = surAnnuler ?? null;
    this.minuteurToast = setTimeout(() => {
      this.messageToast = null;
      this.toastAnnulable = null;
    }, 4000);
  }
}
