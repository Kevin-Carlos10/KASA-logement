import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ArtisanService, DemandeArtisanRecue } from '../../services/artisan.service';
import { AuthService } from '../../services/auth.service';
import { Artisan, Metier, ProfilArtisanModifiable, TypeTarification } from '../../models/artisan.model';
import { BarreNavigationComponent } from '../barre-navigation/barre-navigation.component';

/** Couleurs d'avatar proposées quand l'artisan n'a pas de photo de profil */
const COULEURS_AVATAR: string[] = [
  '#0F766E', '#1D4ED8', '#BE185D', '#7C3AED', '#B45309',
  '#0369A1', '#065F46', '#92400E', '#9D174D', '#1E3A5F',
  '#4B5563', '#7C2D12', '#5B21B6', '#0E7490', '#15803D', '#374151',
];

/**
 * Espace privé de l'artisan connecté : profil (identité, métier, présentation),
 * disponibilité, catalogue de prestations et demandes de mise en relation
 * reçues des locataires.
 * Distinct de `ArtisansComponent` (annuaire public consulté par le
 * locataire pour trouver un artisan) — mais alimenté par la même donnée
 * via `ArtisanService` : ce que l'artisan renseigne ici apparaît exactement
 * tel quel dans la liste publique et dans le détail d'un logement.
 *
 * Route : /artisan (protégée par authGuard, voir app.routes.ts).
 */
@Component({
  selector: 'app-artisan-espace',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, BarreNavigationComponent],
  templateUrl: './artisan-espace.component.html',
  styleUrls: ['./artisan-espace.component.css'],
})
export class ArtisanEspaceComponent implements OnInit {
  artisan: Artisan | null = null;
  chargementEnCours = true;
  artisanIntrouvable = false;
  demandes: DemandeArtisanRecue[] = [];

  readonly couleursAvatar = COULEURS_AVATAR;
  readonly metiers: Metier[] = [];

  ajoutPrestationOuvert = false;
  nouveauLibelle = '';
  nouveauPrix: number | null = null;
  nouveauType: TypeTarification = 'forfait';

  // ── Édition du profil ──────────────────────────────────────────────────────
  profilEnEdition = false;
  formProfil: ProfilArtisanModifiable = this.profilVide();
  nouveauPointFort = '';

  constructor(
    private readonly artisanService: ArtisanService,
    readonly auth: AuthService,
  ) {
    this.metiers = this.artisanService.metiers;
  }

  ngOnInit(): void {
    this.chargerEspace();
  }

  get utilisateur() {
    return this.auth.utilisateur();
  }

  get estArtisan(): boolean {
    return this.utilisateur?.role === 'artisan';
  }

  get demandesEnAttente(): DemandeArtisanRecue[] {
    return this.demandes.filter((d) => d.statut === 'en_attente');
  }

  get demandesTraitees(): DemandeArtisanRecue[] {
    return this.demandes.filter((d) => d.statut === 'traitee');
  }

  private chargerEspace(): void {
    const u = this.utilisateur;
    if (!u || u.role !== 'artisan') {
      this.chargementEnCours = false;
      this.artisanIntrouvable = true;
      return;
    }

    this.chargementEnCours = true;
    this.artisanIntrouvable = false;

    const trouve = this.artisanService.obtenirArtisanParNom(`${u.prenom} ${u.nom}`);
    this.artisan = trouve ?? null;
    this.artisanIntrouvable = !trouve;
    this.chargementEnCours = false;
    if (trouve) {
      this.demandes = this.artisanService.demandesPourArtisan(trouve.id);
    }
  }

  formaterPrix(valeur: number, devise: string): string {
    return `${valeur.toLocaleString('fr-FR')} ${devise}`;
  }

  // ── Profil ───────────────────────────────────────────────────────────────

  /** Le profil est considéré incomplet tant que la spécialité ou la description n'ont pas été renseignées. */
  get profilIncomplet(): boolean {
    if (!this.artisan) return false;
    return !this.artisan.specialite?.trim() || !this.artisan.description?.trim() || !this.artisan.pointsForts?.length;
  }

  private profilVide(): ProfilArtisanModifiable {
    return {
      nom: '',
      metier: 'Électricité',
      specialite: '',
      description: '',
      pointsForts: [],
      anneesExperience: 0,
      quartier: '',
      ville: '',
      whatsapp: '',
      photoUrl: '',
      couleurAvatar: COULEURS_AVATAR[0],
    };
  }

  ouvrirEditionProfil(): void {
    if (!this.artisan) return;
    const a = this.artisan;
    this.formProfil = {
      nom: a.nom,
      metier: a.metier,
      specialite: a.specialite,
      description: a.description,
      pointsForts: [...a.pointsForts],
      anneesExperience: a.anneesExperience,
      quartier: a.quartier,
      ville: a.ville ?? '',
      whatsapp: a.whatsapp,
      photoUrl: a.photoUrl ?? '',
      couleurAvatar: a.couleurAvatar,
    };
    this.nouveauPointFort = '';
    this.profilEnEdition = true;
  }

  annulerEditionProfil(): void {
    this.profilEnEdition = false;
  }

  ajouterPointFort(): void {
    const valeur = this.nouveauPointFort.trim();
    if (!valeur) return;
    this.formProfil.pointsForts = [...this.formProfil.pointsForts, valeur];
    this.nouveauPointFort = '';
  }

  supprimerPointFort(index: number): void {
    this.formProfil.pointsForts = this.formProfil.pointsForts.filter((_, i) => i !== index);
  }

  get profilValide(): boolean {
    return (
      !!this.formProfil.nom.trim() &&
      !!this.formProfil.specialite.trim() &&
      !!this.formProfil.description.trim() &&
      !!this.formProfil.quartier.trim() &&
      !!this.formProfil.whatsapp.trim() &&
      this.formProfil.pointsForts.length > 0
    );
  }

  enregistrerProfil(): void {
    if (!this.artisan || !this.profilValide) return;
    const misAJour = this.artisanService.mettreAJourProfil(this.artisan.id, {
      ...this.formProfil,
      nom: this.formProfil.nom.trim(),
      specialite: this.formProfil.specialite.trim(),
      description: this.formProfil.description.trim(),
      quartier: this.formProfil.quartier.trim(),
      ville: (this.formProfil.ville ?? '').trim(),
      whatsapp: this.formProfil.whatsapp.trim(),
    });
    if (misAJour) this.artisan = misAJour;
    this.profilEnEdition = false;
  }

  // ── Disponibilité ───────────────────────────────────────────────────────

  basculerDisponibilite(): void {
    if (!this.artisan) return;
    this.artisanService.basculerDisponibilite(this.artisan.id);
    this.artisan = { ...this.artisan, disponible: !this.artisan.disponible };
  }

  // ── Prestations ──────────────────────────────────────────────────────────

  ouvrirAjoutPrestation(): void {
    this.ajoutPrestationOuvert = true;
    this.nouveauLibelle = '';
    this.nouveauPrix = null;
    this.nouveauType = 'forfait';
  }

  annulerAjoutPrestation(): void {
    this.ajoutPrestationOuvert = false;
  }

  validerNouvellePrestation(): void {
    if (!this.artisan || !this.nouveauLibelle.trim() || !this.nouveauPrix || this.nouveauPrix <= 0) {
      return;
    }
    this.artisanService.ajouterPrestation(this.artisan.id, {
      libelle: this.nouveauLibelle.trim(),
      prixReference: this.nouveauPrix,
      devise: 'FCFA',
      typeTarification: this.nouveauType,
    });
    this.artisan = this.artisanService.obtenirArtisanParId(this.artisan.id) ?? this.artisan;
    this.ajoutPrestationOuvert = false;
  }

  supprimerPrestation(index: number): void {
    if (!this.artisan) return;
    this.artisanService.supprimerPrestation(this.artisan.id, index);
    this.artisan = this.artisanService.obtenirArtisanParId(this.artisan.id) ?? this.artisan;
  }

  // ── Demandes reçues ──────────────────────────────────────────────────────

  lienWhatsapp(demande: DemandeArtisanRecue): string | null {
    if (!this.artisan) return null;
    return this.artisanService.construireLienWhatsapp(
      this.artisan,
      demande.besoin,
      demande.positionLibelle,
    );
  }

  marquerTraitee(demandeId: string): void {
    this.artisanService.marquerDemandeTraitee(demandeId);
    if (this.artisan) {
      this.demandes = this.artisanService.demandesPourArtisan(this.artisan.id);
    }
  }
}

