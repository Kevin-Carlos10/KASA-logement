export interface FiltreState {
  recherche: string;
  quartier: string | null;
  type: string | null;
  budget: string | null;
  proximite: boolean;
  texte: string | null;
}

export const FILTRE_STATE_INITIAL: FiltreState = {
  recherche: '',
  quartier: null,
  type: null,
  budget: null,
  proximite: false,
  texte: null,
};
