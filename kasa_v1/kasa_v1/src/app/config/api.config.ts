/**
 * Configuration de l'accès à l'API backend Django (KaSa).
 *
 * NB : le backend Django tourne sur le port 8001 (le port 8000 est occupé
 * par un autre serveur sur la machine de dev). Ajuster ici si besoin.
 *
 * `USE_BACKEND` = true  → les services tentent l'API réelle et retombent
 *                          sur les données mock en cas d'échec réseau.
 *              = false → 100 % mock (comportement d'origine).
 */
export const API_BASE_URL = 'http://127.0.0.1:8001/api';

export const USE_BACKEND = true;
