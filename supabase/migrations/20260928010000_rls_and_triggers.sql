-- ============================================================================
-- Sistrs — Row Level Security + triggers
-- ============================================================================
-- Active RLS sur toutes les tables métier et définit les policies d'accès,
-- + quelques triggers utilitaires (updated_at, auto-création du canal d'une
-- organisatrice, notifications in-app sur les événements clés).
-- Voir CLAUDE.md pour le contexte du filtre "femmes uniquement" (appliqué
-- côté client, pas ici) et de la vérification d'identité (pas de KYC).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper : mise à jour automatique de `updated_at`
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-création du canal d'une organisatrice (1 canal par organisatrice)
-- ----------------------------------------------------------------------------
create or replace function ensure_organizer_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'organizer' then
    insert into channels (organizer_id, name)
    values (new.id, trim(new.first_name || ' ' || new.last_name))
    on conflict (organizer_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_ensure_organizer_channel
  after insert or update of role on profiles
  for each row execute function ensure_organizer_channel();

-- ----------------------------------------------------------------------------
-- Notifications in-app sur quelques événements clés
-- ----------------------------------------------------------------------------
create or replace function notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into notifications (profile_id, type, payload)
    values (new.addressee_id, 'friend_request', jsonb_build_object('friendship_id', new.id, 'from_profile_id', new.requester_id));
  end if;
  return new;
end;
$$;

create trigger trg_notify_friend_request
  after insert on friendships
  for each row execute function notify_friend_request();

create or replace function notify_friend_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into notifications (profile_id, type, payload)
    values (new.requester_id, 'friend_accepted', jsonb_build_object('friendship_id', new.id, 'from_profile_id', new.addressee_id));
  end if;
  return new;
end;
$$;

create trigger trg_notify_friend_accepted
  after update on friendships
  for each row execute function notify_friend_accepted();

create or replace function notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
begin
  select case when c.participant_a = new.sender_id then c.participant_b else c.participant_a end
  into recipient_id
  from conversations c
  where c.id = new.conversation_id;

  insert into notifications (profile_id, type, payload)
  values (recipient_id, 'new_message', jsonb_build_object('conversation_id', new.conversation_id, 'from_profile_id', new.sender_id));

  return new;
end;
$$;

create trigger trg_notify_new_message
  after insert on messages
  for each row execute function notify_new_message();

create or replace function notify_registration_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organizer_id uuid;
begin
  if new.status = 'confirmed' then
    select e.organizer_id into organizer_id from events e where e.id = new.event_id;

    insert into notifications (profile_id, type, payload)
    values (new.participant_id, 'registration_confirmed', jsonb_build_object('event_id', new.event_id));

    insert into notifications (profile_id, type, payload)
    values (organizer_id, 'registration_confirmed', jsonb_build_object('event_id', new.event_id, 'from_profile_id', new.participant_id));

    update profiles set activity_count = activity_count + 1 where id = new.participant_id;
  end if;
  return new;
end;
$$;

create trigger trg_notify_registration_confirmed
  after insert on event_registrations
  for each row execute function notify_registration_confirmed();

create or replace function notify_poll_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (profile_id, type, payload)
  select cs.subscriber_id, 'poll_created', jsonb_build_object('poll_id', new.id, 'channel_id', new.channel_id)
  from channel_subscriptions cs
  where cs.channel_id = new.channel_id;
  return new;
end;
$$;

create trigger trg_notify_poll_created
  after insert on polls
  for each row execute function notify_poll_created();

-- ----------------------------------------------------------------------------
-- Activation RLS
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table participant_preferences enable row level security;
alter table organizer_specialties enable row level security;
alter table categories enable row level security;
alter table channels enable row level security;
alter table channel_subscriptions enable row level security;
alter table events enable row level security;
alter table event_shopping_list_items enable row level security;
alter table event_registrations enable row level security;
alter table event_reviews enable row level security;
alter table channel_posts enable row level security;
alter table channel_post_likes enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
alter table friendships enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

create policy "profiles_insert_own" on profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- CATEGORIES (lecture seule côté client)
-- ----------------------------------------------------------------------------
create policy "categories_select_authenticated" on categories
  for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- PARTICIPANT PREFERENCES / ORGANIZER SPECIALTIES
-- ----------------------------------------------------------------------------
create policy "participant_preferences_select_authenticated" on participant_preferences
  for select to authenticated using (true);
create policy "participant_preferences_manage_own" on participant_preferences
  for all to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "organizer_specialties_select_authenticated" on organizer_specialties
  for select to authenticated using (true);
create policy "organizer_specialties_manage_own" on organizer_specialties
  for all to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- CHANNELS
-- ----------------------------------------------------------------------------
create policy "channels_select_authenticated" on channels
  for select to authenticated using (true);
create policy "channels_update_own" on channels
  for update to authenticated using (auth.uid() = organizer_id) with check (auth.uid() = organizer_id);

create policy "channel_subscriptions_select_authenticated" on channel_subscriptions
  for select to authenticated using (true);
create policy "channel_subscriptions_manage_own" on channel_subscriptions
  for all to authenticated using (auth.uid() = subscriber_id) with check (auth.uid() = subscriber_id);

-- ----------------------------------------------------------------------------
-- EVENTS
-- ----------------------------------------------------------------------------
create policy "events_select_authenticated" on events
  for select to authenticated using (true);
create policy "events_insert_own_channel" on events
  for insert to authenticated with check (
    auth.uid() = organizer_id
    and exists (select 1 from channels c where c.id = channel_id and c.organizer_id = auth.uid())
  );
create policy "events_update_own" on events
  for update to authenticated using (auth.uid() = organizer_id) with check (auth.uid() = organizer_id);
create policy "events_delete_own" on events
  for delete to authenticated using (auth.uid() = organizer_id);

create policy "event_shopping_list_select_authenticated" on event_shopping_list_items
  for select to authenticated using (true);
create policy "event_shopping_list_insert" on event_shopping_list_items
  for insert to authenticated with check (
    auth.uid() = added_by and (
      exists (select 1 from events e where e.id = event_id and e.organizer_id = auth.uid())
      or exists (select 1 from event_registrations r where r.event_id = event_id and r.participant_id = auth.uid())
    )
  );
create policy "event_shopping_list_update" on event_shopping_list_items
  for update to authenticated using (
    exists (select 1 from events e where e.id = event_id and e.organizer_id = auth.uid())
    or exists (select 1 from event_registrations r where r.event_id = event_id and r.participant_id = auth.uid())
  );
create policy "event_shopping_list_delete" on event_shopping_list_items
  for delete to authenticated using (
    auth.uid() = added_by or exists (select 1 from events e where e.id = event_id and e.organizer_id = auth.uid())
  );

create policy "event_registrations_select" on event_registrations
  for select to authenticated using (
    auth.uid() = participant_id
    or exists (select 1 from events e where e.id = event_id and e.organizer_id = auth.uid())
  );
create policy "event_registrations_insert_own" on event_registrations
  for insert to authenticated with check (auth.uid() = participant_id);
create policy "event_registrations_update" on event_registrations
  for update to authenticated using (
    auth.uid() = participant_id
    or exists (select 1 from events e where e.id = event_id and e.organizer_id = auth.uid())
  );
create policy "event_registrations_delete_own" on event_registrations
  for delete to authenticated using (auth.uid() = participant_id);

create policy "event_reviews_select_authenticated" on event_reviews
  for select to authenticated using (true);
create policy "event_reviews_insert_own" on event_reviews
  for insert to authenticated with check (
    auth.uid() = participant_id
    and exists (select 1 from event_registrations r where r.event_id = event_id and r.participant_id = auth.uid())
  );
create policy "event_reviews_update_own" on event_reviews
  for update to authenticated using (auth.uid() = participant_id) with check (auth.uid() = participant_id);
create policy "event_reviews_delete_own" on event_reviews
  for delete to authenticated using (auth.uid() = participant_id);

-- ----------------------------------------------------------------------------
-- CHANNEL POSTS / LIKES
-- ----------------------------------------------------------------------------
create policy "channel_posts_select_authenticated" on channel_posts
  for select to authenticated using (true);
create policy "channel_posts_insert_own_channel" on channel_posts
  for insert to authenticated with check (
    exists (select 1 from channels c where c.id = channel_id and c.organizer_id = auth.uid())
  );
create policy "channel_posts_update_own_channel" on channel_posts
  for update to authenticated using (
    exists (select 1 from channels c where c.id = channel_id and c.organizer_id = auth.uid())
  );
create policy "channel_posts_delete_own_channel" on channel_posts
  for delete to authenticated using (
    exists (select 1 from channels c where c.id = channel_id and c.organizer_id = auth.uid())
  );

create policy "channel_post_likes_select_authenticated" on channel_post_likes
  for select to authenticated using (true);
create policy "channel_post_likes_manage_own" on channel_post_likes
  for all to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- POLLS
-- ----------------------------------------------------------------------------
create policy "polls_select_authenticated" on polls
  for select to authenticated using (true);
create policy "polls_insert_own_channel" on polls
  for insert to authenticated with check (
    exists (select 1 from channels c where c.id = channel_id and c.organizer_id = auth.uid())
  );
create policy "polls_update_own_channel" on polls
  for update to authenticated using (
    exists (select 1 from channels c where c.id = channel_id and c.organizer_id = auth.uid())
  );
create policy "polls_delete_own_channel" on polls
  for delete to authenticated using (
    exists (select 1 from channels c where c.id = channel_id and c.organizer_id = auth.uid())
  );

create policy "poll_options_select_authenticated" on poll_options
  for select to authenticated using (true);
create policy "poll_options_insert_own_channel" on poll_options
  for insert to authenticated with check (
    exists (
      select 1 from polls p join channels c on c.id = p.channel_id
      where p.id = poll_id and c.organizer_id = auth.uid()
    )
  );
create policy "poll_options_delete_own_channel" on poll_options
  for delete to authenticated using (
    exists (
      select 1 from polls p join channels c on c.id = p.channel_id
      where p.id = poll_id and c.organizer_id = auth.uid()
    )
  );

create policy "poll_votes_select_authenticated" on poll_votes
  for select to authenticated using (true);
create policy "poll_votes_manage_own" on poll_votes
  for all to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- FRIENDSHIPS
-- ----------------------------------------------------------------------------
create policy "friendships_select_own" on friendships
  for select to authenticated using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships_insert_own" on friendships
  for insert to authenticated with check (auth.uid() = requester_id);
create policy "friendships_update_addressee" on friendships
  for update to authenticated using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);
create policy "friendships_delete_own" on friendships
  for delete to authenticated using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ----------------------------------------------------------------------------
-- CONVERSATIONS / MESSAGES
-- ----------------------------------------------------------------------------
create policy "conversations_select_own" on conversations
  for select to authenticated using (auth.uid() = participant_a or auth.uid() = participant_b);
create policy "conversations_insert_own" on conversations
  for insert to authenticated with check (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "messages_select_own_conversation" on messages
  for select to authenticated using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );
create policy "messages_insert_own" on messages
  for insert to authenticated with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );
create policy "messages_update_read_status" on messages
  for update to authenticated using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS (écriture réservée aux triggers, security definer)
-- ----------------------------------------------------------------------------
create policy "notifications_select_own" on notifications
  for select to authenticated using (auth.uid() = profile_id);
create policy "notifications_update_own" on notifications
  for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
