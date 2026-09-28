// Petit bus d'événements en mémoire pour signaler des changements qui
// doivent rafraîchir un état ailleurs dans l'app sans passer par un
// contexte React dédié (ex : un canal marqué comme vu doit effacer le
// point rouge sur l'onglet Canaux immédiatement, pas seulement au
// prochain sondage de useTabBadges).
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToChannelsRead(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyChannelsRead(): void {
  listeners.forEach((listener) => listener());
}
