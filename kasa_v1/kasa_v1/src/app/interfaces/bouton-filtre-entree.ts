export interface BoutonFiltreEntree {
  id: string;
  label: string;
  icone: string;
  options: { label: string; valeur: string }[];
  valeurSelectionnee?: string | null;
}
