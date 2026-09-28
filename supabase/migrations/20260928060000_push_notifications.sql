-- ============================================================================
-- Notifications push (gratuit, service push d'Expo) : chaque notification
-- in-app déjà créée par les triggers existants (notify_friend_request,
-- notify_new_message, etc.) déclenche maintenant AUSSI l'envoi d'une
-- notification push, sans toucher à ces triggers : un seul trigger
-- supplémentaire sur `notifications` suffit, puisque tout y transite déjà.
-- ============================================================================

alter table profiles add column if not exists push_token text;

-- pg_net permet à Postgres de faire un appel HTTP sortant asynchrone,
-- directement vers l'API push d'Expo (https://exp.host/--/api/v2/push/send)
-- — gratuite, sans clé, sans backend/Edge Function à déployer.
create extension if not exists pg_net;

create or replace function push_new_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_push_token text;
  v_body text;
  v_from_name text;
begin
  select push_token into v_push_token from profiles where id = new.profile_id;

  if v_push_token is null or v_push_token = '' then
    return new;
  end if;

  if new.payload ? 'from_profile_id' then
    select trim(first_name || ' ' || last_name) into v_from_name
    from profiles where id = (new.payload ->> 'from_profile_id')::uuid;
  end if;

  v_body := case new.type
    when 'friend_request' then coalesce(v_from_name, 'Quelqu''une') || ' vous a envoyé une demande d''amie'
    when 'friend_accepted' then coalesce(v_from_name, 'Quelqu''une') || ' a accepté votre demande'
    when 'new_message' then 'Nouveau message de ' || coalesce(v_from_name, 'quelqu''une')
    when 'registration_confirmed' then 'Inscription confirmée'
    when 'poll_created' then 'Nouveau sondage dans un canal que tu suis'
    when 'event_reminder' then 'Rappel : un événement approche'
    when 'event_update' then 'Un événement que tu suis a été mis à jour'
    when 'new_follower' then coalesce(v_from_name, 'Quelqu''une') || ' s''est abonnée à ton canal'
    when 'new_post' then 'Nouvelle publication dans un canal que tu suis'
    else 'Nouvelle notification'
  end;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
    body := jsonb_build_object(
      'to', v_push_token,
      'title', 'Sistrs',
      'body', v_body,
      'data', coalesce(new.payload, '{}'::jsonb)
    )
  );

  return new;
end;
$$;

create trigger trg_push_new_notification
  after insert on notifications
  for each row execute function push_new_notification();
