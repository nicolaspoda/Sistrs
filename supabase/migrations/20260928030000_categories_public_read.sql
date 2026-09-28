-- ============================================================================
-- Sistrs — Lecture publique des catégories
-- ============================================================================
-- `categories` est choisie à l'étape "préférences" de l'inscription, AVANT
-- que le compte (et donc la session) n'existe (signUp() n'est appelé qu'au
-- clic final sur "Créer mon compte"). La policy précédente ("to
-- authenticated") bloquait donc silencieusement cette lecture pour une
-- utilisatrice pas encore inscrite — la liste de catégories apparaissait
-- vide côté app sans aucune erreur visible.
-- Catégories = données de référence publiques (pas de donnée personnelle),
-- donc lecture ouverte au rôle anonyme ne pose pas de problème.
-- ============================================================================

drop policy if exists "categories_select_authenticated" on categories;

create policy "categories_select_public" on categories
  for select to anon, authenticated using (true);
