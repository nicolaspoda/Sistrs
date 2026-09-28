-- ============================================================================
-- Buckets Supabase Storage pour les uploads réels (avatars + pièces
-- d'identité), remplaçant le stockage d'URI locale utilisé jusqu'ici.
-- ============================================================================

-- `avatars` : public en lecture (affiché à toute utilisatrice sur les
-- profils/événements/canaux), écriture restreinte à la propriétaire.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- `id-documents` : privé — aucune lecture publique, seule la propriétaire
-- peut lire/écrire son propre document (voir CLAUDE.md, pas de vérification
-- automatique, juste un stockage sécurisé du fichier uploadé).
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

-- Convention de chemin commune aux deux buckets : `<profile_id>/<fichier>`,
-- ce qui permet de vérifier la propriété via `storage.foldername(name)[1]`.

create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "id_documents_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "id_documents_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "id_documents_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "id_documents_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);
