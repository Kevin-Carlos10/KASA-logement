import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard : redirige vers l'accueil et ouvre la modal de connexion
 * si l'utilisateur n'est pas connecté.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.estConnecte()) {
    return true;
  }

  auth.ouvrirModal('connexion');
  return false;
};
