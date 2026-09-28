-- ============================================================================
-- Sistrs — Jeu de données de démo (local uniquement)
-- ============================================================================
-- Rejoué automatiquement par `supabase db reset` (voir [db.seed] dans
-- supabase/config.toml). Permet de tester tout de suite le parcours
-- participante ET organisatrice sans repartir d'une base vide : 3
-- organisatrices avec chacune un canal (auto-créé par le trigger
-- `ensure_organizer_channel`), 5 participantes, une dizaine d'événements
-- répartis sur les 3 semaines à venir, des inscriptions, des posts, des
-- sondages et des abonnements de canaux.
--
-- Comptes de démo (mot de passe identique pour tous, uniquement en local) :
--   camille.organizer@sistrs.test / lea.organizer@sistrs.test /
--   sarah.organizer@sistrs.test  (organisatrices)
--   emma.participant@sistrs.test / chloe.participant@sistrs.test /
--   manon.participant@sistrs.test / julie.participant@sistrs.test /
--   ines.participant@sistrs.test  (participantes)
--   Mot de passe pour toutes : Password123!
--
-- Le nouveau compte créé via l'app (toi) n'est pas affecté par ce fichier :
-- il vit à côté de ces comptes de démo. Un `db reset` efface en revanche
-- TOUS les comptes déjà créés dans l'app, démo ou pas — à re-créer après.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Comptes auth.users + auth.identities (nécessaire pour se connecter par
-- email/mot de passe — pattern standard pour seeder Supabase Auth en local)
-- ----------------------------------------------------------------------------
do $$
declare
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
  v_password text := crypt('Password123!', gen_salt('bf'));
  v_users uuid[] := array[
    'a0000000-0000-0000-0000-000000000001', -- Camille (organizer)
    'a0000000-0000-0000-0000-000000000002', -- Léa (organizer)
    'a0000000-0000-0000-0000-000000000003', -- Sarah (organizer)
    'b0000000-0000-0000-0000-000000000001', -- Emma (participant)
    'b0000000-0000-0000-0000-000000000002', -- Chloé (participant)
    'b0000000-0000-0000-0000-000000000003', -- Manon (participant)
    'b0000000-0000-0000-0000-000000000004', -- Julie (participant)
    'b0000000-0000-0000-0000-000000000005'  -- Inès (participant)
  ];
  v_emails text[] := array[
    'camille.organizer@sistrs.test',
    'lea.organizer@sistrs.test',
    'sarah.organizer@sistrs.test',
    'emma.participant@sistrs.test',
    'chloe.participant@sistrs.test',
    'manon.participant@sistrs.test',
    'julie.participant@sistrs.test',
    'ines.participant@sistrs.test'
  ];
  v_id uuid;
  v_email text;
  i int;
begin
  for i in 1 .. array_length(v_users, 1) loop
    v_id := v_users[i];
    v_email := v_emails[i];

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, raw_app_meta_data,
      raw_user_meta_data, is_super_admin, created_at, updated_at,
      confirmed_at
    ) values (
      v_instance_id, v_id, 'authenticated', 'authenticated', v_email, v_password,
      now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}', '{}', false, now(), now(),
      now()
    )
    on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email),
      'email', now(), now(), now()
    )
    on conflict (provider, provider_id) do nothing;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Profils
-- ----------------------------------------------------------------------------
insert into profiles (id, first_name, last_name, birth_date, gender, age_bracket, role, bio, face_id_enabled, activity_count)
values
  ('a0000000-0000-0000-0000-000000000001', 'Camille', 'Dubois', '1994-03-12', 'femme', '26-30', 'organizer', 'Organisatrice de soirées bar & karaoké sur Paris. Toujours partante pour un cocktail !', true, 40),
  ('a0000000-0000-0000-0000-000000000002', 'Léa', 'Martin', '1990-07-22', 'femme', '30+', 'organizer', 'Yoga, brunchs et randonnées entre filles — je t''emmène respirer un peu.', true, 60),
  ('a0000000-0000-0000-0000-000000000003', 'Sarah', 'Bernard', '1997-11-02', 'femme', '18-25', 'organizer', 'Ciné, expos et soirées jeux de société. Team culture & fous rires.', true, 25),
  ('b0000000-0000-0000-0000-000000000001', 'Emma', 'Petit', '1996-05-14', 'femme', '26-30', 'participant', 'Toujours dispo pour un afterwork ou un brunch.', true, 32),
  ('b0000000-0000-0000-0000-000000000002', 'Chloé', 'Robert', '1999-01-30', 'femme', '18-25', 'participant', 'Nouvelle sur l''app, j''ai hâte de rencontrer du monde !', true, 4),
  ('b0000000-0000-0000-0000-000000000003', 'Manon', 'Richard', '1993-09-08', 'femme', '26-30', 'participant', 'Karaoké et cocktails, c''est ma vie.', true, 78),
  ('b0000000-0000-0000-0000-000000000004', 'Julie', 'Durand', '1988-12-19', 'femme', '30+', 'participant', 'Randonnées le week-end, yoga en semaine.', true, 15),
  ('b0000000-0000-0000-0000-000000000005', 'Inès', 'Leroy', '1995-04-25', 'femme', '26-30', 'participant', 'Ciné et jeux de société, toujours prête pour une bonne partie.', true, 8)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Spécialités des organisatrices / préférences des participantes
-- ----------------------------------------------------------------------------
insert into organizer_specialties (profile_id, category_id)
select 'a0000000-0000-0000-0000-000000000001'::uuid, id from categories where name in ('Bar', 'Karaoké', 'Cocktails', 'Afterwork')
union all
select 'a0000000-0000-0000-0000-000000000002'::uuid, id from categories where name in ('Yoga', 'Brunch', 'Randonnée', 'Spa & bien-être')
union all
select 'a0000000-0000-0000-0000-000000000003'::uuid, id from categories where name in ('Ciné', 'Expo & culture', 'Jeux de société')
on conflict do nothing;

insert into participant_preferences (profile_id, category_id)
select 'b0000000-0000-0000-0000-000000000001'::uuid, id from categories where name in ('Afterwork', 'Bar', 'Cocktails')
union all
select 'b0000000-0000-0000-0000-000000000002'::uuid, id from categories where name in ('Ciné', 'Shopping', 'Brunch')
union all
select 'b0000000-0000-0000-0000-000000000003'::uuid, id from categories where name in ('Karaoké', 'Bar', 'Danse')
union all
select 'b0000000-0000-0000-0000-000000000004'::uuid, id from categories where name in ('Randonnée', 'Yoga', 'Spa & bien-être')
union all
select 'b0000000-0000-0000-0000-000000000005'::uuid, id from categories where name in ('Ciné', 'Jeux de société', 'Expo & culture')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Abonnements aux canaux (les canaux eux-mêmes sont auto-créés par le
-- trigger ensure_organizer_channel lors de l'insert des profils organizer)
-- ----------------------------------------------------------------------------
insert into channel_subscriptions (channel_id, subscriber_id)
select c.id, p.subscriber_id
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000003'::uuid),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000004'::uuid),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'b0000000-0000-0000-0000-000000000005'::uuid)
) as p(organizer_id, subscriber_id)
join channels c on c.organizer_id = p.organizer_id
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Événements (dates relatives à aujourd'hui pour rester "à venir" après
-- n'importe quel db reset)
-- ----------------------------------------------------------------------------
insert into events (
  id, organizer_id, channel_id, category_id, title, description, start_at, end_at,
  meeting_point, meeting_lat, meeting_lng, max_participants, registration_deadline, status
)
select
  v.id, v.organizer_id, c.id, cat.id, v.title, v.description, v.start_at, v.end_at,
  v.meeting_point, v.meeting_lat, v.meeting_lng, v.max_participants, v.registration_deadline, 'published'
from (values
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Bar',
   'Afterwork cocktails au Perchoir', 'On se retrouve en terrasse pour décompresser après la semaine, cocktails et bonne ambiance garantis.',
   now() + interval '3 days' + interval '19 hours', now() + interval '3 days' + interval '22 hours',
   'Le Perchoir, Ménilmontant, Paris', 48.8636::double precision, 2.3833::double precision, 20, now() + interval '1 day'),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Karaoké',
   'Soirée karaoké entre filles', 'Location d''un salon privé, on chante sans jugement jusqu''à plus soif.',
   now() + interval '6 days' + interval '20 hours', now() + interval '6 days' + interval '23 hours',
   'Studio Karaoké, Bastille, Paris', 48.8532::double precision, 2.3692::double precision, 12, now() + interval '4 days'),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'Yoga',
   'Yoga au parc + brunch', 'Séance de yoga douce en plein air suivie d''un brunch entre filles.',
   now() + interval '2 days' + interval '9 hours', now() + interval '2 days' + interval '12 hours',
   'Parc des Buttes-Chaumont, Paris', 48.8809::double precision, 2.3776::double precision, 15, now() - interval '1 hour'),
  ('e0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'Randonnée',
   'Randonnée forêt de Fontainebleau', 'Une journée au grand air, niveau facile, tenue confortable recommandée.',
   now() + interval '9 days' + interval '8 hours', now() + interval '9 days' + interval '17 hours',
   'Gare de Fontainebleau-Avon', null, null, 10, now() + interval '6 days'),
  ('e0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'Spa & bien-être',
   'Après-midi spa & bien-être', 'Détente totale : sauna, hammam et moment entre filles.',
   now() + interval '14 days' + interval '14 hours', now() + interval '14 days' + interval '18 hours',
   'Spa Nuxe, Paris', 48.8656::double precision, 2.3212::double precision, 8, now() + interval '11 days'),
  ('e0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'Ciné',
   'Ciné + débat entre filles', 'Projection d''un film indépendant suivie d''un échange autour d''un verre.',
   now() + interval '4 days' + interval '20 hours', now() + interval '4 days' + interval '23 hours',
   'Le Grand Action, Paris', 48.8478::double precision, 2.3517::double precision, 25, now() + interval '2 days'),
  ('e0000000-0000-0000-0000-000000000007'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'Jeux de société',
   'Soirée jeux de société', 'Bar à jeux, on teste des nouveautés et des classiques, tous niveaux bienvenus.',
   now() + interval '7 days' + interval '19 hours', now() + interval '7 days' + interval '23 hours',
   'La Mesa Verde, Paris', 48.8646::double precision, 2.3897::double precision, 16, now() + interval '5 days'),
  ('e0000000-0000-0000-0000-000000000008'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'Expo & culture',
   'Visite d''expo commentée', 'Visite guidée d''une expo temporaire, suivie d''un café pour en discuter.',
   now() + interval '11 days' + interval '15 hours', now() + interval '11 days' + interval '17 hours',
   'Palais de Tokyo, Paris', 48.8641::double precision, 2.2967::double precision, 18, now() + interval '9 days'),
  ('e0000000-0000-0000-0000-000000000009'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Cocktails',
   'Atelier cocktails sans alcool', 'On apprend à réaliser de jolis mocktails avec une barmaid pro.',
   now() + interval '16 days' + interval '18 hours', now() + interval '16 days' + interval '20 hours',
   'Bar Le Mary Celeste, Paris', 48.8657::double precision, 2.3625::double precision, 14, now() + interval '13 days')
) as v(id, organizer_id, cat_name, title, description, start_at, end_at, meeting_point, meeting_lat, meeting_lng, max_participants, registration_deadline)
join channels c on c.organizer_id = v.organizer_id
join categories cat on cat.name = v.cat_name
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Inscriptions à quelques événements (pour voir des places prises / avatars)
-- ----------------------------------------------------------------------------
insert into event_registrations (event_id, participant_id, status, face_id_verified_at)
values
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'confirmed', now()),
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'confirmed', now()),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'confirmed', now()),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'confirmed', now()),
  ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'confirmed', now()),
  ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005', 'confirmed', now()),
  ('e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 'confirmed', now())
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Posts dans les canaux (certains liés à un événement, d'autres non)
-- ----------------------------------------------------------------------------
insert into channel_posts (id, channel_id, event_id, content)
select v.id, c.id, v.event_id, v.content
from (values
  ('f0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'e0000000-0000-0000-0000-000000000001'::uuid, 'On se retrouve vendredi pour l''afterwork ! Qui vient ? 🍹'),
  ('f0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, null, 'Merci à toutes pour la super soirée karaoké de la dernière fois, on remet ça très vite !'),
  ('f0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'e0000000-0000-0000-0000-000000000003'::uuid, 'Petit rappel : yoga + brunch ce week-end, tenue confortable et bonne humeur 🧘‍♀️'),
  ('f0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'e0000000-0000-0000-0000-000000000006'::uuid, 'Le film de vendredi va vous plaire, j''ai hâte d''en discuter avec vous après la séance !')
) as v(id, organizer_id, event_id, content)
join channels c on c.organizer_id = v.organizer_id
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Sondages + options + quelques votes
-- ----------------------------------------------------------------------------
insert into polls (id, channel_id, question)
select v.id, c.id, v.question
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Quel thème pour la prochaine soirée ?'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'Quel jour vous convient le mieux pour le prochain brunch ?')
) as v(id, organizer_id, question)
join channels c on c.organizer_id = v.organizer_id
on conflict (id) do nothing;

insert into poll_options (id, poll_id, label, position)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Années 2000', 0),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Cocktails tropicaux', 1),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Karaoké géant', 2),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Samedi matin', 0),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Dimanche midi', 1)
on conflict (id) do nothing;

insert into poll_votes (poll_id, option_id, profile_id)
values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004')
on conflict do nothing;
