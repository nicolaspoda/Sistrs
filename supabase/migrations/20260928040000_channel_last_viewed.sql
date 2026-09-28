-- ============================================================================
-- Sistrs — Suivi de lecture des canaux (pour le badge "nouveau contenu")
-- ============================================================================
-- Permet de savoir si un canal suivi a du nouveau contenu (post/sondage)
-- depuis la dernière visite de l'abonnée, pour afficher un indicateur dans
-- la liste des canaux et un point rouge sur l'onglet Canaux.
-- ============================================================================

alter table channel_subscriptions
  add column if not exists last_viewed_at timestamptz;
