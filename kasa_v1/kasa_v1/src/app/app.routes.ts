import { Routes } from '@angular/router';

import { LogementsPageComponent } from './composants/logement/logement-page.component';
import { ArtisansComponent } from './composants/artisans/artisans.component';
import { SimulateurBudgetComponent } from './composants/simulateur-budget/simulateur-budget.component';
import { ModalDetailComponent } from './composants/modal-detail/modal-detail.component';
import { ProfilComponent } from './composants/profil/profil.component';
import { IndiceLoyers } from './composants/indice-loyers/indice-loyers.component';
import { SoutienComponent } from './composants/soutien/soutien.component';
import { GerantComponent } from './composants/gerant/gerant.component';
import { ArtisanEspaceComponent } from './composants/artisan-espace/artisan-espace.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: LogementsPageComponent,
    children: [],
  },
  {
    path: 'logement/:id',
    component: ModalDetailComponent,
  },
  {
    path: 'profil/agent/:id',
    component: ProfilComponent,
    data: { type: 'agent' },
  },
  {
    path: 'profil/bailleur/:id',
    component: ProfilComponent,
    data: { type: 'bailleur' },
  },
  {
    path: 'artisans',
    component: ArtisansComponent,
  },
  {
    path: 'gerant',
    component: GerantComponent,
 
  },
  {
    path: 'artisan',
    component: ArtisanEspaceComponent,
    canActivate: [authGuard],
  },
  {
    path: 'budget',
    component: SimulateurBudgetComponent,
  },
  {
    path: 'indice',
    component: IndiceLoyers,
  },
  {
    path: 'soutien',
    component: SoutienComponent,
  },
];
