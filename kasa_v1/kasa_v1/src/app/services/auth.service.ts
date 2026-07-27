import { Injectable, signal, computed, effect, inject, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, USE_BACKEND } from '../config/api.config';

export type RoleUtilisateur = 'locataire' | 'gerant' | 'artisan';

export interface UtilisateurConnecte {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: RoleUtilisateur;
  initiales: string;
  avatarUrl?: string;
  membreDepuis: string;
  favoris: string[]; // ids logements
  logementsMasques: string[]; // ids logements
  notificationsNonLues: number;
}

export interface DemandeConnexion {
  email: string;
  motDePasse: string;
}

export interface DemandeInscription {
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  role: RoleUtilisateur;
}

export type ErreurAuth =
  'email_introuvable' | 'mot_de_passe_incorrect' | 'email_deja_utilise' | 'champs_manquants' | null;

const CLE_STORAGE = 'kasa_utilisateur';

/** Comptes de démonstration prêts à l'emploi */
const COMPTES_DEMO: UtilisateurConnecte[] = [
  {
    id: 'u-001',
    prenom: 'Aïcha',
    nom: 'Kaboré',
    email: 'aicha@kasa.bf',
    role: 'locataire',
    initiales: 'AK',
    membreDepuis: 'Janvier 2025',
    favoris: ['log-001', 'log-004'],
    logementsMasques: [],
    notificationsNonLues: 2,
  },
  {
    id: 'u-002',
    prenom: 'Saidou',
    nom: 'Compaoré',
    email: 'saidou@kasa.bf',
    role: 'gerant',
    initiales: 'SC',
    membreDepuis: 'Mars 2022',
    favoris: [],
    logementsMasques: [],
    notificationsNonLues: 5,
  },
  {
    id: 'u-003',
    prenom: 'Boureima',
    nom: 'Sawadogo',
    email: 'boureima@kasa.bf',
    role: 'gerant',
    initiales: 'BS',
    membreDepuis: 'Juin 2023',
    favoris: [],
    logementsMasques: [],
    notificationsNonLues: 0,
  },
  {
    id: 'u-004',
    prenom: 'Issouf',
    nom: 'Ouédraogo',
    email: 'issouf@kasa.bf',
    role: 'artisan',
    initiales: 'IO',
    membreDepuis: 'Février 2024',
    favoris: [],
    logementsMasques: [],
    notificationsNonLues: 1,
  },
];

const CLE_TOKEN = 'kasa_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly urlAuth = `${API_BASE_URL}/users/auth`;

  private readonly _utilisateur = signal<UtilisateurConnecte | null>(null);
  private readonly _chargement = signal(false);
  private readonly _erreur = signal<ErreurAuth>(null);
  private readonly _modalOuverte = signal(false);
  private readonly _ongletModal = signal<'connexion' | 'inscription'>('connexion');

  /** Utilisateur actuellement connecté (null = non connecté) */
  readonly utilisateur = this._utilisateur.asReadonly();
  readonly estConnecte = computed(() => this._utilisateur() !== null);
  readonly chargement = this._chargement.asReadonly();
  readonly erreur = this._erreur.asReadonly();
  readonly modalOuverte = this._modalOuverte.asReadonly();
  readonly ongletModal = this._ongletModal.asReadonly();

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
  ) {
    // Restaurer la session depuis le localStorage au démarrage
    if (isPlatformBrowser(this.platformId)) {
      const json = localStorage.getItem(CLE_STORAGE);
      if (json) {
        try {
          this._utilisateur.set(JSON.parse(json));
        } catch {
          localStorage.removeItem(CLE_STORAGE);
        }
      }
    }

    // Persister automatiquement chaque changement
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const u = this._utilisateur();
      if (u) {
        localStorage.setItem(CLE_STORAGE, JSON.stringify(u));
      } else {
        localStorage.removeItem(CLE_STORAGE);
      }
    });
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  ouvrirModal(onglet: 'connexion' | 'inscription' = 'connexion'): void {
    this._ongletModal.set(onglet);
    this._erreur.set(null);
    this._modalOuverte.set(true);
  }

  fermerModal(): void {
    this._modalOuverte.set(false);
    this._erreur.set(null);
  }

  basculerOnglet(onglet: 'connexion' | 'inscription'): void {
    this._ongletModal.set(onglet);
    this._erreur.set(null);
  }

  // ── Authentification ─────────────────────────────────────────────────────

  // ── Backend JWT (avec repli mock) ─────────────────────────────────────────

  /** Django TokenObtainPair attend un `username` ; on le dérive de l'email. */
  private usernameDepuisEmail(email: string): string {
    return email.includes('@') ? email.split('@')[0] : email;
  }

  private roleDepuisUser(u: any): RoleUtilisateur {
    if (u.is_artisan) return 'artisan';
    if (u.is_bailleur || u.is_agent_terrain) return 'gerant';
    return 'locataire';
  }

  private mapUserBackend(u: any): UtilisateurConnecte {
    const prenom = u.first_name || u.username || '';
    const nom = u.last_name || '';
    const initiales = `${prenom[0] ?? u.username?.[0] ?? '?'}${nom[0] ?? ''}`.toUpperCase();
    let membreDepuis = '';
    if (u.created_at) {
      try {
        membreDepuis = new Date(u.created_at).toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        });
      } catch {
        membreDepuis = '';
      }
    }
    return {
      id: u.id,
      prenom,
      nom,
      email: u.email ?? '',
      role: this.roleDepuisUser(u),
      initiales,
      membreDepuis,
      favoris: [],
      logementsMasques: [],
      notificationsNonLues: 0,
    };
  }

  private stockerToken(token: string | null): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (token) localStorage.setItem(CLE_TOKEN, token);
    else localStorage.removeItem(CLE_TOKEN);
  }

  /** Tente la connexion via l'API Django. `null` = échec réseau/API (→ repli mock). */
  private async connecterBackend(demande: DemandeConnexion): Promise<boolean | null> {
    try {
      const tokens = await firstValueFrom(
        this.http.post<{ access: string; refresh: string }>(`${this.urlAuth}/login/`, {
          username: this.usernameDepuisEmail(demande.email),
          password: demande.motDePasse,
        }),
      );
      this.stockerToken(tokens.access);
      const user = await firstValueFrom(
        this.http.get<any>(`${this.urlAuth}/me/`, {
          headers: { Authorization: `Bearer ${tokens.access}` },
        }),
      );
      this._utilisateur.set(this.mapUserBackend(user));
      return true;
    } catch (e: any) {
      // 401 = identifiants invalides (réponse claire de l'API) ; on l'affiche.
      if (e?.status === 401) {
        this._erreur.set('mot_de_passe_incorrect');
        return false;
      }
      // Autre (API injoignable, CORS, 5xx…) → laisser le repli mock décider.
      return null;
    }
  }

  connecter(demande: DemandeConnexion): Promise<boolean> {
    this._chargement.set(true);
    this._erreur.set(null);

    if (USE_BACKEND) {
      return this.connecterBackend(demande).then((res) => {
        if (res !== null) {
          this._chargement.set(false);
          if (res) this.fermerModal();
          return res;
        }
        // Repli mock si l'API est injoignable
        return this.connecterMock(demande);
      });
    }
    return this.connecterMock(demande);
  }

  private connecterMock(demande: DemandeConnexion): Promise<boolean> {
    return new Promise((resolve) => {
      // Simuler un délai réseau
      setTimeout(() => {
        const compte = COMPTES_DEMO.find(
          (c) => c.email.toLowerCase() === demande.email.toLowerCase(),
        );

        if (!compte) {
          this._erreur.set('email_introuvable');
          this._chargement.set(false);
          resolve(false);
          return;
        }

        // Mot de passe demo : "kasa1234" pour tous
        if (demande.motDePasse !== 'kasa1234') {
          this._erreur.set('mot_de_passe_incorrect');
          this._chargement.set(false);
          resolve(false);
          return;
        }

        this._utilisateur.set({ ...compte });
        this._chargement.set(false);
        this.fermerModal();
        resolve(true);
      }, 800);
    });
  }

  /** Inscription via l'API Django. `null` = échec réseau/API (→ repli mock). */
  private async inscrireBackend(demande: DemandeInscription): Promise<boolean | null> {
    if (!demande.prenom || !demande.nom || !demande.email || !demande.motDePasse) {
      this._erreur.set('champs_manquants');
      return false;
    }
    const flags = {
      is_locataire: demande.role === 'locataire',
      is_bailleur: demande.role === 'gerant',
      is_artisan: demande.role === 'artisan',
    };
    const payload = {
      username: this.usernameDepuisEmail(demande.email),
      email: demande.email,
      password: demande.motDePasse,
      first_name: demande.prenom,
      last_name: demande.nom,
      // phone_number est requis et unique côté backend : on en génère un pseudo-unique.
      phone_number: `+226${Date.now().toString().slice(-8)}`,
      ...flags,
    };
    try {
      await firstValueFrom(this.http.post(`${this.urlAuth}/register/`, payload));
      // Enchaîner sur une connexion pour récupérer le token + le profil.
      const ok = await this.connecterBackend({
        email: demande.email,
        motDePasse: demande.motDePasse,
      });
      return ok === null ? null : ok;
    } catch (e: any) {
      if (e?.status === 400) {
        // username/email/phone déjà pris, ou mot de passe rejeté.
        this._erreur.set('email_deja_utilise');
        return false;
      }
      return null;
    }
  }

  inscrire(demande: DemandeInscription): Promise<boolean> {
    this._chargement.set(true);
    this._erreur.set(null);

    if (USE_BACKEND) {
      return this.inscrireBackend(demande).then((res) => {
        if (res !== null) {
          this._chargement.set(false);
          if (res) this.fermerModal();
          return res;
        }
        return this.inscrireMock(demande);
      });
    }
    return this.inscrireMock(demande);
  }

  private inscrireMock(demande: DemandeInscription): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!demande.prenom || !demande.nom || !demande.email || !demande.motDePasse) {
          this._erreur.set('champs_manquants');
          this._chargement.set(false);
          resolve(false);
          return;
        }

        const existe = COMPTES_DEMO.find(
          (c) => c.email.toLowerCase() === demande.email.toLowerCase(),
        );
        if (existe) {
          this._erreur.set('email_deja_utilise');
          this._chargement.set(false);
          resolve(false);
          return;
        }

        const nouvelUtilisateur: UtilisateurConnecte = {
          id: `u-${Date.now()}`,
          prenom: demande.prenom,
          nom: demande.nom,
          email: demande.email,
          role: demande.role,
          initiales: `${demande.prenom[0]}${demande.nom[0]}`.toUpperCase(),
          membreDepuis: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          favoris: [],
          logementsMasques: [],
          notificationsNonLues: 0,
        };

        // Ajouter aux comptes démo pour la session
        COMPTES_DEMO.push(nouvelUtilisateur);
        this._utilisateur.set(nouvelUtilisateur);
        this._chargement.set(false);
        this.fermerModal();
        resolve(true);
      }, 900);
    });
  }

  deconnecter(): void {
    this._utilisateur.set(null);
    this.stockerToken(null);
    this.router.navigate(['/home']);
  }

  // ── Favoris ──────────────────────────────────────────────────────────────

  estEnFavoris(logementId: string): boolean {
    return this._utilisateur()?.favoris.includes(logementId) ?? false;
  }

  basculerFavori(logementId: string): 'ajoute' | 'retire' | 'non_connecte' {
    const u = this._utilisateur();
    if (!u) return 'non_connecte';

    const idx = u.favoris.indexOf(logementId);
    const nouveauxFavoris = [...u.favoris];
    if (idx >= 0) {
      nouveauxFavoris.splice(idx, 1);
      this._utilisateur.set({ ...u, favoris: nouveauxFavoris });
      return 'retire';
    } else {
      nouveauxFavoris.push(logementId);
      this._utilisateur.set({ ...u, favoris: nouveauxFavoris });
      return 'ajoute';
    }
  }

  // ── Logements masqués ────────────────────────────────────────────────────

  estMasque(logementId: string): boolean {
    return this._utilisateur()?.logementsMasques.includes(logementId) ?? false;
  }

  masquer(logementId: string): void {
    const u = this._utilisateur();
    if (!u) return;
    if (!u.logementsMasques.includes(logementId)) {
      this._utilisateur.set({ ...u, logementsMasques: [...u.logementsMasques, logementId] });
    }
  }

  demasquer(logementId: string): void {
    const u = this._utilisateur();
    if (!u) return;
    this._utilisateur.set({
      ...u,
      logementsMasques: u.logementsMasques.filter((id) => id !== logementId),
    });
  }

  // ── Erreur lisible ────────────────────────────────────────────────────────

  libelleErreur(): string {
    switch (this._erreur()) {
      case 'email_introuvable':
        return 'Aucun compte trouvé pour cet email.';
      case 'mot_de_passe_incorrect':
        return 'Mot de passe incorrect. Essayez "kasa1234" (démo).';
      case 'email_deja_utilise':
        return 'Un compte existe déjà avec cet email.';
      case 'champs_manquants':
        return 'Veuillez remplir tous les champs.';
      default:
        return '';
    }
  }
}
