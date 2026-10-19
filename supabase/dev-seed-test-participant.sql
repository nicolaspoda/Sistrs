-- ============================================================================
-- Sistrs — Données de test pour un compte de démo (parcours participante)
-- ============================================================================
-- À lancer À LA MAIN (pas rejoué par `supabase db reset`), une fois que le
-- compte de test ci-dessous existe déjà (créé via le vrai écran d'inscription
-- de l'app, pour que l'onboarding lui-même soit testable aussi).
--
-- Compte attendu : email = 'test.participante@sistrs.app'
-- (change la valeur de v_test_email ci-dessous si tu as utilisé un autre
-- email pendant l'inscription).
--
-- Remplit : abonnement aux 3 canaux de démo, une demande d'amie reçue, une
-- amie déjà acceptée, une demande envoyée par le compte de test et acceptée
-- en retour, un message non lu, une inscription confirmée à un événement à
-- venir, et les notifications correspondantes (+ les types sans trigger
-- automatique) — pour tester tout le parcours participante dès la connexion.
--
-- Rejouable sans erreur (chaque insert est protégé par on conflict do
-- nothing ou une vérification d'existence).
-- ============================================================================

do $$
declare
  v_test_email text := 'test.participante@sistrs.app';
  v_me uuid;
  v_emma uuid := 'b0000000-0000-0000-0000-000000000001';
  v_chloe uuid := 'b0000000-0000-0000-0000-000000000002';
  v_manon uuid := 'b0000000-0000-0000-0000-000000000003';
  v_organizers uuid[] := array[
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003'
  ];
  v_conversation_id uuid;
  v_event_id uuid;
  v_friendship_id uuid;
  v_past_event_id uuid := 'c0000000-0000-0000-0000-000000000099';
  v_past_event_title text := 'Brunch de rentrée (test avis E2E)';
  v_past_channel_id uuid;
  v_past_category_id uuid;
begin
  select id into v_me from auth.users where email = v_test_email;
  if v_me is null then
    raise exception 'Aucun compte avec l''email % — crée-le d''abord via l''écran d''inscription de l''app.', v_test_email;
  end if;

  -- 1) Abonnement aux 3 canaux de démo (contenu visible dans l'onglet Canaux)
  insert into channel_subscriptions (channel_id, subscriber_id)
  select c.id, v_me from channels c
  where c.organizer_id = any(v_organizers)
  on conflict do nothing;

  -- 2) Demande d'amie reçue (Emma -> moi) : déclenche la notif "friend_request"
  --    + le point rose sur l'onglet Amies.
  insert into friendships (requester_id, addressee_id, status)
  values (v_emma, v_me, 'pending')
  on conflict (requester_id, addressee_id) do nothing;

  -- 3) Déjà amie avec Chloé (insert direct en "accepted", pas de notif ici —
  --    juste pour avoir une amie avec qui discuter dans Messages).
  insert into friendships (requester_id, addressee_id, status, responded_at)
  values (v_chloe, v_me, 'accepted', now())
  on conflict (requester_id, addressee_id) do nothing;

  -- 4) Ma propre demande à Manon, acceptée juste après : déclenche la notif
  --    "friend_accepted" (celle qu'on reçoit quand quelqu'un accepte NOTRE
  --    demande).
  insert into friendships (requester_id, addressee_id, status)
  values (v_me, v_manon, 'pending')
  on conflict (requester_id, addressee_id) do nothing
  returning id into v_friendship_id;

  if v_friendship_id is null then
    select id into v_friendship_id from friendships
    where requester_id = v_me and addressee_id = v_manon and status = 'pending';
  end if;

  if v_friendship_id is not null then
    update friendships set status = 'accepted', responded_at = now() where id = v_friendship_id;
  end if;

  -- 5) Conversation + message non lu envoyé par Chloé : déclenche "new_message"
  --    + le point rose sur l'onglet Messages.
  insert into conversations (participant_a, participant_b)
  values (least(v_me, v_chloe), greatest(v_me, v_chloe))
  on conflict (participant_a, participant_b) do nothing;

  select id into v_conversation_id from conversations
  where participant_a = least(v_me, v_chloe) and participant_b = greatest(v_me, v_chloe);

  insert into messages (conversation_id, sender_id, content)
  values (v_conversation_id, v_chloe, 'Coucou ! Tu viens à la soirée de vendredi soir ? 🍸');

  -- 6) Inscription confirmée au prochain événement à venir qui a de la place :
  --    déclenche "registration_confirmed" (+ incrémente activity_count), et
  --    permet de voir la carte en état "Tu es inscrite ✓" sur Accueil.
  select e.id into v_event_id
  from events e
  where e.status = 'published' and e.start_at > now()
  order by e.start_at
  limit 1;

  if v_event_id is not null then
    insert into event_registrations (event_id, participant_id, status)
    values (v_event_id, v_me, 'confirmed')
    on conflict (event_id, participant_id) do nothing;
  end if;

  -- 7) Événement déjà passé, avec ma participation confirmée, pour tester le
  --    parcours "laisser un avis" (.maestro/event-review.yaml). Id et titre
  --    fixes (idempotent, comme les comptes emma/chloe/manon ci-dessus) :
  --    pas d'UI pour créer un événement dans le passé (minimumDate =
  --    aujourd'hui sur le formulaire de création), donc seedé directement
  --    ici. Organisé par le premier organisateur de démo (v_organizers[1]).
  select id into v_past_channel_id from channels where organizer_id = v_organizers[1];
  select id into v_past_category_id from categories limit 1;

  if v_past_channel_id is not null and v_past_category_id is not null then
    insert into events (
      id, organizer_id, channel_id, category_id, title, description,
      meeting_point, start_at, end_at, max_participants, registration_deadline, status
    ) values (
      v_past_event_id, v_organizers[1], v_past_channel_id, v_past_category_id, v_past_event_title,
      'Événement de test, déjà terminé, pour valider le parcours avis via e2e.',
      'Café de test', now() - interval '3 days', now() - interval '3 days' + interval '2 hours',
      10, now() - interval '4 days', 'published'
    )
    on conflict (id) do nothing;

    insert into event_registrations (event_id, participant_id, status)
    values (v_past_event_id, v_me, 'confirmed')
    on conflict (event_id, participant_id) do nothing;

    -- Notification de rappel dédiée à CET événement (distincte de celle de
    -- l'étape 7 ci-dessous, qui pointe vers l'événement à venir) : c'est le
    -- seul chemin UI actuel pour atteindre le détail d'un événement passé,
    -- l'app n'a pas d'écran "mes événements passés" — voir PROGRESS.md.
    insert into notifications (profile_id, type, payload)
    select v_me, 'event_reminder', jsonb_build_object('event_id', v_past_event_id)
    where not exists (
      select 1 from notifications
      where profile_id = v_me
        and type = 'event_reminder'
        and payload->>'event_id' = v_past_event_id::text
    );
  end if;

  -- 8) Notifications manuelles pour les types qui n'ont pas de trigger
  --    automatique dans le code actuel (juste pour voir leur rendu dans
  --    l'écran Notifications).
  insert into notifications (profile_id, type, payload) values
    (v_me, 'event_reminder', jsonb_build_object('event_id', v_event_id)),
    (v_me, 'event_update', jsonb_build_object('event_id', v_event_id)),
    (v_me, 'new_follower', jsonb_build_object('from_profile_id', v_manon)),
    (v_me, 'new_post', jsonb_build_object());

  raise notice 'Données de test ajoutées pour le profil % (%)', v_me, v_test_email;
end $$;
