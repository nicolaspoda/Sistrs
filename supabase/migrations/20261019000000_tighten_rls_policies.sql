-- ============================================================================
-- Sistrs — Resserrement RLS (profils / inscriptions / likes / votes)
-- ============================================================================
-- PROGRESS.md "RLS à revisiter" : les policies initiales (migration
-- 20260928010000) privilégiaient la simplicité (`using (true)` pour la
-- plupart des SELECT) plutôt qu'une confidentialité stricte. Trois fuites
-- concrètes identifiées :
--   1. N'importe quelle utilisatrice authentifiée peut lister TOUTE la table
--      `profiles` (y compris birth_date, gender, id_document_url,
--      face_id_enabled, push_token) via un simple `select * from profiles`,
--      pas seulement via la recherche d'amies de l'app.
--   2. `event_registrations` est lisible intégralement : on peut requêter
--      qui est inscrite à quel événement, pour n'importe quelle inscrite,
--      sans lien avec cet événement (stalking potentiel — app réservée aux
--      femmes, donc sensible).
--   3. `channel_post_likes` / `poll_votes` exposent le `profile_id` de
--      chaque like/vote à tout le monde, alors que l'UI n'affiche que des
--      compteurs agrégés et "ai-je liké/voté".
--
-- Nouveau modèle (voir CLAUDE.md) :
--   - `profiles` visible : soi-même, ses amies (demande en attente incluse,
--     pour afficher le nom sur une demande reçue), les organisatrices (un
--     canal = une organisatrice, semi-publique par nature de l'app) et les
--     personnes partageant un événement avec la demandeuse (inscrite au
--     même événement, ou événement qu'elle organise).
--   - `event_registrations` visible en lecture : sa propre inscription,
--     l'organisatrice de l'événement, et les autres inscrites UNIQUEMENT
--     pour une utilisatrice elle-même inscrite à ce même événement.
--   - `channel_post_likes` / `poll_votes` visibles en lecture : son propre
--     like/vote uniquement. Les compteurs agrégés restent disponibles pour
--     tout le monde via des fonctions SECURITY DEFINER dédiées (lecture
--     seule, pas d'identité exposée) utilisées comme "computed columns"
--     PostgREST : `channel_post_likes_count`, `poll_option_votes_count`.
--   - Même principe pour le nombre d'inscrites confirmées à un événement
--     (`event_confirmed_count`), nécessaire pour un calcul fiable de
--     "places restantes" même quand la liste détaillée des inscrites n'est
--     plus visible par tout le monde (app/event/[id].tsx,
--     components/events/EventCard.tsx).
--
-- Vérifié avant d'écrire cette migration (grep du code Supabase-js) :
-- aucun écran ne fait de "browse all profiles" — seule la recherche
-- d'amies (app/(tabs)/friends.tsx) fait un select large par nom, et son
-- périmètre se resserre logiquement avec ce modèle (recherche restreinte
-- aux personnes avec qui on a déjà un point de contact : amie, organisatrice,
-- événement commun). Les écrans affichant les inscrites/organisatrices/
-- avis (home, détail événement, canal) continuent de fonctionner : la
-- liste détaillée peut devenir partielle pour une utilisatrice qui n'a
-- aucun lien avec l'événement (pas encore inscrite, pas organisatrice),
-- mais les compteurs (places restantes, nb de likes, % de votes) restent
-- exacts pour tout le monde grâce aux fonctions SECURITY DEFINER ci-dessous.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonctions agrégées (SECURITY DEFINER = contournent RLS sur les tables
-- sous-jacentes, ne renvoient qu'un compteur, jamais une identité).
-- Utilisables comme "computed columns" PostgREST : `.select("*, alias:fn")`.
-- ----------------------------------------------------------------------------
create or replace function channel_post_likes_count(p channel_posts)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from channel_post_likes l where l.post_id = p.id;
$$;

revoke all on function channel_post_likes_count(channel_posts) from public;
grant execute on function channel_post_likes_count(channel_posts) to authenticated;

create or replace function poll_option_votes_count(o poll_options)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from poll_votes v where v.option_id = o.id;
$$;

revoke all on function poll_option_votes_count(poll_options) from public;
grant execute on function poll_option_votes_count(poll_options) to authenticated;

create or replace function event_confirmed_count(e events)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from event_registrations r where r.event_id = e.id and r.status = 'confirmed';
$$;

revoke all on function event_confirmed_count(events) from public;
grant execute on function event_confirmed_count(events) to authenticated;

-- ----------------------------------------------------------------------------
-- PROFILES — remplace la lecture ouverte par un périmètre "lien existant"
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_select_authenticated" on profiles;

create policy "profiles_select_scoped" on profiles
  for select to authenticated using (
    auth.uid() = id
    -- amies (demande en attente ou acceptée, dans les deux sens)
    or exists (
      select 1 from friendships f
      where f.status in ('pending', 'accepted')
        and (
          (f.requester_id = auth.uid() and f.addressee_id = profiles.id)
          or (f.addressee_id = auth.uid() and f.requester_id = profiles.id)
        )
    )
    -- organisatrices : semi-publiques (1 canal par organisatrice, affiché partout)
    or exists (select 1 from channels c where c.organizer_id = profiles.id)
    -- personnes partageant un événement avec la demandeuse (inscrite au
    -- même événement que la demandeuse, ou événement que la demandeuse organise)
    or exists (
      select 1
      from event_registrations shared_reg
      join events e on e.id = shared_reg.event_id
      where shared_reg.participant_id = profiles.id
        and (
          e.organizer_id = auth.uid()
          or exists (
            select 1 from event_registrations viewer_reg
            where viewer_reg.event_id = shared_reg.event_id
              and viewer_reg.participant_id = auth.uid()
          )
        )
    )
  );

-- ----------------------------------------------------------------------------
-- EVENT_REGISTRATIONS — la liste détaillée des inscrites n'est plus publique
-- ----------------------------------------------------------------------------
drop policy if exists "event_registrations_select" on event_registrations;

create policy "event_registrations_select_scoped" on event_registrations
  for select to authenticated using (
    auth.uid() = participant_id
    or exists (select 1 from events e where e.id = event_id and e.organizer_id = auth.uid())
    or exists (
      select 1 from event_registrations viewer_reg
      where viewer_reg.event_id = event_registrations.event_id
        and viewer_reg.participant_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- CHANNEL_POST_LIKES / POLL_VOTES — lecture limitée à son propre like/vote ;
-- les compteurs agrégés passent par les fonctions ci-dessus.
-- ----------------------------------------------------------------------------
drop policy if exists "channel_post_likes_select_authenticated" on channel_post_likes;

create policy "channel_post_likes_select_own" on channel_post_likes
  for select to authenticated using (auth.uid() = profile_id);

drop policy if exists "poll_votes_select_authenticated" on poll_votes;

create policy "poll_votes_select_own" on poll_votes
  for select to authenticated using (auth.uid() = profile_id);
