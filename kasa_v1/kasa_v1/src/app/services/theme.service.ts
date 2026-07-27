import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * KaSa n'a plus qu'un seul thème (clair). Le thème sombre / noir a été
 * retiré du produit : aucune bascule n'est proposée à l'utilisateur et
 * il n'existe plus aucun moyen de repasser l'interface en noir.
 * Le service est conservé (au lieu d'être supprimé) pour ne pas casser
 * d'éventuelles références existantes, mais il ne fait plus qu'appliquer
 * le thème clair de façon fixe.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly estNavigateur = isPlatformBrowser(this.platformId);

  constructor() {
    if (this.estNavigateur) {
      document.documentElement.setAttribute('data-theme', 'light');
      // Nettoyage d'un éventuel choix "sombre" persisté avant la suppression du thème noir.
      localStorage.removeItem('kasa-theme');
    }
  }
}
