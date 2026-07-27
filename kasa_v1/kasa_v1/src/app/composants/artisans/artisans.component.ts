import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BarreNavigationComponent } from '../barre-navigation/barre-navigation.component';
import { ArtisanService } from '../../services/artisan.service';
import { Artisan, Metier, Prestation } from '../../models/artisan.model';

// ─── Icônes par métier ──────────────────────────────────────────────────────
export const ICONE_CATEGORIE: Record<Metier, string> = {
  'Vidange fosse & WC': '🚽',
  'Débouchage canalisation': '🪠',
  'Serrurerie': '🔑',
  'Groupe électrogène': '🔌',
  'Forage & pompe à eau': '🚰',
  'Dératisation & désinsectisation': '🐀',
  'Soudure & ferronnerie': '🛠️',
  'Déménagement': '🚛',
  'Nettoyage': '🧹',
  'Internet & TV': '📡',
  'Livraison meubles': '🛋️',
  'Décoration': '🪴',
  'Sécurité & Caméras': '📹',
  'Électricité': '⚡',
  'Plomberie': '🔧',
  'Maçonnerie': '🧱',
  'Menuiserie': '🪵',
  'Peinture': '🎨',
  'Climatisation': '❄️',
  'Jardinage': '🌿',
  'Gardiennage': '🛡️',
  'Chauffeur': '🚗',
};

/**
 * Annuaire public des artisans (page /artisans).
 * Les données proviennent désormais d'`ArtisanService`, la même source que
 * l'espace artisan connecté (`ArtisanEspaceComponent`) : un artisan qui
 * remplit son profil apparaît ici avec exactement les mêmes informations.
 */
@Component({
  selector: 'app-artisans',
  standalone: true,
  imports: [CommonModule, FormsModule, BarreNavigationComponent],
  templateUrl: './artisans.component.html',
  styleUrls: ['./artisans.component.css'],
})
export class ArtisansComponent {
  readonly icones = ICONE_CATEGORIE;

  constructor(private readonly artisanService: ArtisanService) {}

  /**
   * Catégories affichées, ordonnées du service le plus demandé au moins
   * demandé (demande = total des interventions réalisées par les artisans
   * du métier). Seuls les métiers ayant au moins un professionnel apparaissent.
   */
  get categories(): Metier[] {
    const demande = new Map<Metier, number>();
    for (const a of this.tous) {
      demande.set(a.metier, (demande.get(a.metier) ?? 0) + a.nombreInterventions);
    }
    return [...demande.keys()].sort((x, y) => (demande.get(y) ?? 0) - (demande.get(x) ?? 0));
  }

  /** Toujours à jour : reflète les profils tels que remplis par les artisans connectés. */
  get tous(): Artisan[] {
    return this.artisanService.obtenirArtisans();
  }

  categorieActive: Metier | null = null;
  disponibleUniquement = false;
  artisanProfil: Artisan | null = null; // modale profil complet
  artisanContact: Artisan | null = null; // modale contact WhatsApp
  besoin = '';
  position = '';

  // ── Filtrage ───────────────────────────────────────────────────────────────

  filtrerCategorie(c: Metier): void {
    this.categorieActive = this.categorieActive === c ? null : c;
  }

  /** Affiche tous les artisans (réinitialise le filtre). */
  afficherTous(): void {
    this.categorieActive = null;
  }

  get listeAffichee(): Artisan[] {
    return this.tous.filter(
      (a) =>
        (!this.categorieActive || a.metier === this.categorieActive) &&
        (!this.disponibleUniquement || a.disponible),
    );
  }

  // ── Profil ─────────────────────────────────────────────────────────────────

  ouvrirProfil(a: Artisan): void {
    this.artisanProfil = a;
  }
  fermerProfil(): void {
    this.artisanProfil = null;
  }

  // ── Contact ────────────────────────────────────────────────────────────────

  ouvrirContact(a: Artisan): void {
    this.artisanContact = a;
    this.artisanProfil = null;
    this.besoin = '';
    this.position = '';
  }

  fermerContact(): void {
    this.artisanContact = null;
  }

  envoyerWhatsapp(): void {
    if (!this.artisanContact) return;
    const url = this.artisanService.construireLienWhatsapp(
      this.artisanContact,
      this.besoin || this.artisanContact.specialite,
      this.position || this.artisanContact.quartier,
    );
    window.open(url, '_blank');
    this.fermerContact();
  }

  // ── Utilitaires ────────────────────────────────────────────────────────────

  /** Prix de référence le plus bas, affiché sur la carte comme repère rapide ("à partir de") */
  prixDepart(a: Artisan): Prestation {
    return a.prestations.reduce((min, p) => (p.prixReference < min.prixReference ? p : min), a.prestations[0]);
  }

  etoiles(note: number): (1 | 0)[] {
    return Array.from({ length: 5 }, (_, i) => (i < Math.round(note) ? 1 : 0)) as (1 | 0)[];
  }

  surFondClick(e: MouseEvent, fermer: () => void): void {
    if ((e.target as HTMLElement).classList.contains('art-overlay')) fermer();
  }
}
