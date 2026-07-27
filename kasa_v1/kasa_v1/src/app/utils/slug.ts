/**
 * Génère un identifiant URL-safe stable à partir d'un nom.
 * Utilisé pour construire les routes de profil (/profil/agent/:id,
 * /profil/bailleur/:id) sans avoir besoin d'un vrai id back-end pour
 * l'instant — à remplacer par l'id réel dès que l'API existe.
 *
 * Ex : "Boureima Sawadogo" → "boureima-sawadogo"
 */
export function slugifier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}
