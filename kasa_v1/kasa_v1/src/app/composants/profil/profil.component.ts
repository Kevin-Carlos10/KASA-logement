import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LogementService } from '../../services/logement.service';
import { AvisLocataire } from '../../models/logement.model';
import { ProfilPersonne, TypeProfil } from '../../models/profil.model';
import { BarreNavigationComponent } from '../barre-navigation/barre-navigation.component';

/**
 * Page profil publique consultée par le locataire, pour un agent terrain
 * ou un bailleur (autonome, représenté, ou profil non renseigné).
 *
 * Routes : /profil/agent/:id et /profil/bailleur/:id (voir app.routes.ts,
 * data.type détermine quel appel de service faire).
 */
@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, RouterLink, BarreNavigationComponent],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css'],
})
export class ProfilComponent implements OnInit, OnDestroy {
  profil: ProfilPersonne | null = null;
  chargementEnCours = true;
  profilIntrouvable = false;
  avisEtendus = false;

  private routeSub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly logementService: LogementService,
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      const type = (this.route.snapshot.data['type'] as TypeProfil) ?? 'bailleur';
      if (!id) return;

      this.chargementEnCours = true;
      this.profilIntrouvable = false;
      this.avisEtendus = false;

      const obs$ =
        type === 'agent'
          ? this.logementService.obtenirProfilAgent(id)
          : this.logementService.obtenirProfilBailleur(id);

      obs$.subscribe({
        next: (profil) => {
          this.chargementEnCours = false;
          this.profil = profil ?? null;
          this.profilIntrouvable = !profil;
        },
        error: (err) => {
          console.error('Erreur lors du chargement du profil', err);
          this.chargementEnCours = false;
          this.profil = null;
          this.profilIntrouvable = true;
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  get avisAffiches(): AvisLocataire[] {
    if (!this.profil) return [];
    return this.avisEtendus ? this.profil.avis : this.profil.avis.slice(0, 3);
  }

  basculerAvis(): void {
    this.avisEtendus = !this.avisEtendus;
  }

  formaterPrix(valeur: number, devise: string): string {
    return `${valeur.toLocaleString('fr-FR')} ${devise}`;
  }
}
