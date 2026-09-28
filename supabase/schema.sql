-- ============================================================================
-- Rosie — Schéma de données Supabase (PostgreSQL)
-- ============================================================================
-- Convention : auth.users (Supabase Auth) est la source de vérité pour
-- l'authentification. `profiles` étend chaque utilisateur avec 1 ligne (1:1).
-- RLS (Row Level Security) à activer sur toutes les tables en prod — non
-- inclus ici pour rester lisible, à ajouter table par table ensuite.
-- ============================================================================

create extension if not exists postgis;
create extension if not exists pgcrypto; -- pour gen_random_uuid()

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('participant', 'organizer');
-- Pas de contrainte CHECK limitant les valeurs acceptées à "femme" : le
-- filtre "femmes uniquement" est appliqué au niveau applicatif (formulaire
-- d'inscription), pas en base — voir CLAUDE.md § Décisions de sécurité.
-- Texte libre déclaratif plutôt qu'enum fermé, pour rester inclusif sans
-- devoir migrer le schéma si de nouvelles valeurs doivent être ajoutées.
create type age_bracket as enum ('18-25', '26-30', '30+');
create type user_status as enum ('commun', 'bronze', 'argent', 'or', 'diamant');
create type event_status as enum ('draft', 'published', 'cancelled', 'completed');
create type registration_status as enum ('pending', 'confirmed', 'cancelled');
create type friendship_status as enum ('pending', 'accepted', 'declined');
create type notification_type as enum (
  'friend_request', 'friend_accepted', 'event_reminder', 'event_update',
  'new_follower', 'new_post', 'poll_created', 'new_message', 'registration_confirmed'
);

-- ----------------------------------------------------------------------------
-- CATEGORIES (hashtags d'événements / préférences participantes / spécialités organisatrices)
-- Table unique partagée par les 3 usages, pour rester cohérent partout.
-- ----------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- ex. "Ciné", "Restau", "Bar", "Karaoké"
  emoji text,                          -- ex. "🎬"
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PROFILES (1:1 avec auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  gender text not null,                       -- déclaratif, non contraint en base — voir note plus haut et CLAUDE.md
  age_bracket age_bracket not null,          -- tranche déclarée (peut différer légèrement de birth_date, à valider ensemble)
  role user_role not null default 'participant',
  bio text,
  avatar_url text,
  banner_url text,
  id_document_url text,                       -- upload CNI/passeport/permis — NON vérifié automatiquement pour l'instant (pas de prestataire KYC branché)
  face_id_enabled boolean not null default false,
  activity_count integer not null default 0,  -- incrémenté à chaque participation confirmée à un événement
  status user_status generated always as (
    case
      when activity_count >= 100 then 'diamant'
      when activity_count >= 75  then 'or'
      when activity_count >= 50  then 'argent'
      when activity_count >= 25  then 'bronze'
      else 'commun'
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Préférences des participantes (jusqu'à 5 — contrainte applicative, pas SQL)
create table participant_preferences (
  profile_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (profile_id, category_id)
);

-- Spécialité(s) des organisatrices (catégorie de base, mais elles peuvent sortir de leur spécificité sur un événement donné)
create table organizer_specialties (
  profile_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (profile_id, category_id)
);

-- ----------------------------------------------------------------------------
-- CHANNELS — un canal auto-créé par organisatrice (1:1)
-- ----------------------------------------------------------------------------
create table channels (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null unique references profiles(id) on delete cascade,
  name text not null,                 -- par défaut = nom de l'organisatrice
  description text,
  created_at timestamptz not null default now()
);

create table channel_subscriptions (
  channel_id uuid not null references channels(id) on delete cascade,
  subscriber_id uuid not null references profiles(id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  primary key (channel_id, subscriber_id)
);

-- ----------------------------------------------------------------------------
-- EVENTS
-- ----------------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references profiles(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  category_id uuid not null references categories(id),  -- le "hashtag" de l'événement
  title text not null,
  description text not null,
  cover_image_url text,
  start_at timestamptz not null,
  end_at timestamptz,                                     -- optionnelle
  meeting_point text not null,
  meeting_lat double precision,
  meeting_lng double precision,
  max_participants integer not null check (max_participants > 0),
  registration_deadline timestamptz not null,             -- doit être <= start_at - interval '24 hours' (vérifié en appli + check ci-dessous)
  status event_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_deadline_valid check (registration_deadline <= start_at - interval '24 hours')
);

create table event_shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  is_checked boolean not null default false,
  added_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  participant_id uuid not null references profiles(id) on delete cascade,
  status registration_status not null default 'confirmed',
  face_id_verified_at timestamptz,      -- horodatage de la vérif Face ID au moment de l'inscription
  registered_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

create table event_reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  participant_id uuid not null references profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

-- ----------------------------------------------------------------------------
-- CHANNEL POSTS (promotion d'événements + posts libres) + LIKES
-- ----------------------------------------------------------------------------
create table channel_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  event_id uuid references events(id) on delete set null,   -- nullable : un post peut ne pas concerner un événement précis
  content text,
  image_url text,
  created_at timestamptz not null default now()
);

create table channel_post_likes (
  post_id uuid not null references channel_posts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

-- ----------------------------------------------------------------------------
-- POLLS (sondages dans les canaux)
-- ----------------------------------------------------------------------------
create table polls (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  post_id uuid references channel_posts(id) on delete cascade,  -- optionnel : sondage rattaché ou autonome
  question text not null,
  created_at timestamptz not null default now(),
  closes_at timestamptz
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  position smallint not null default 0
);

create table poll_votes (
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (poll_id, profile_id)   -- une seule voix par personne et par sondage
);

-- ----------------------------------------------------------------------------
-- AMIS
-- ----------------------------------------------------------------------------
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

-- ----------------------------------------------------------------------------
-- MESSAGERIE PRIVÉE (1:1 entre amies)
-- ----------------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references profiles(id) on delete cascade,
  participant_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (participant_a < participant_b),  -- évite les doublons (a,b) / (b,a) — trier les 2 ids côté appli avant insert
  unique (participant_a, participant_b)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  payload jsonb not null default '{}',   -- ex. { "event_id": "...", "from_profile_id": "..." }
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- INDEX utiles
-- ----------------------------------------------------------------------------
create index idx_events_channel on events(channel_id);
create index idx_events_start_at on events(start_at);
create index idx_events_category on events(category_id);
create index idx_registrations_event on event_registrations(event_id);
create index idx_registrations_participant on event_registrations(participant_id);
create index idx_channel_posts_channel on channel_posts(channel_id, created_at desc);
create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_notifications_profile on notifications(profile_id, read_at);
create index idx_friendships_addressee on friendships(addressee_id, status);
