import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'logement/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'profil/agent/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'profil/bailleur/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
