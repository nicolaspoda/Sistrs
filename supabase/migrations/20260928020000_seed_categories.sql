-- ============================================================================
-- Sistrs — Catégories de base (hashtags événements / préférences / spécialités)
-- ============================================================================
-- La table `categories` était vide, ce qui rendait les écrans de
-- préférences/spécialités (inscription, profil) et le choix de catégorie à
-- la création d'un événement inutilisables. `on conflict do nothing` pour
-- rester idempotent (rejouable sans erreur sur une base déjà seedée).
-- ============================================================================

insert into categories (name, emoji) values
  ('Bar', '🍹'),
  ('Restau', '🍽️'),
  ('Ciné', '🎬'),
  ('Karaoké', '🎤'),
  ('Brunch', '🥐'),
  ('Randonnée', '🥾'),
  ('Yoga', '🧘‍♀️'),
  ('Cocktails', '🍸'),
  ('Shopping', '🛍️'),
  ('Jeux de société', '🎲'),
  ('Spa & bien-être', '💆‍♀️'),
  ('Danse', '💃'),
  ('Expo & culture', '🖼️'),
  ('Plage & piscine', '🏖️'),
  ('Afterwork', '🥂')
on conflict (name) do nothing;
