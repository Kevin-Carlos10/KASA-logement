import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, RoleUtilisateur } from '../../services/auth.service';

@Component({
  selector: 'app-modal-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-auth.component.html',
  styleUrls: ['./modal-auth.component.css'],
})
export class ModalAuthComponent {
  // Formulaire connexion
  emailConnexion = '';
  motDePasseConnexion = '';
  motDePasseVisible = false;

  // Formulaire inscription
  prenomInscription = '';
  nomInscription = '';
  emailInscription = '';
  motDePasseInscription = '';
  roleInscription: RoleUtilisateur = 'locataire';

  readonly COMPTES_DEMO = [
    { email: 'aicha@kasa.bf', role: 'Locataire', prenom: 'Aïcha' },
    { email: 'saidou@kasa.bf', role: 'Gérant', prenom: 'Saidou' },
    { email: 'boureima@kasa.bf', role: 'Gérant (agent terrain)', prenom: 'Boureima' },
    { email: 'issouf@kasa.bf', role: 'Artisan', prenom: 'Issouf' },
  ];

  constructor(readonly auth: AuthService) {}

  get onglet() {
    return this.auth.ongletModal();
  }

  get chargement() {
    return this.auth.chargement();
  }

  get erreur() {
    return this.auth.libelleErreur();
  }

  fermer(): void {
    this.auth.fermerModal();
  }

  basculer(onglet: 'connexion' | 'inscription'): void {
    this.auth.basculerOnglet(onglet);
  }

  async soumettreCx(): Promise<void> {
    await this.auth.connecter({
      email: this.emailConnexion,
      motDePasse: this.motDePasseConnexion,
    });
  }

  async soumettreInscription(): Promise<void> {
    await this.auth.inscrire({
      prenom: this.prenomInscription,
      nom: this.nomInscription,
      email: this.emailInscription,
      motDePasse: this.motDePasseInscription,
      role: this.roleInscription,
    });
  }

  remplirDemo(email: string): void {
    this.emailConnexion = email;
    this.motDePasseConnexion = 'kasa1234';
  }

  surFondClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('auth-overlay')) {
      this.fermer();
    }
  }
}
