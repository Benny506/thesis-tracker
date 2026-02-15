-- Create public chat_media bucket for 1v1 chat and configure RLS policies

insert into storage.buckets (id, name, public)
values ('chat_media', 'chat_media', true)
on conflict (id) do update set public = true;

-- Allow anyone to read objects in chat_media (public URLs are also used)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read chat media'
  ) then
    create policy "Public can read chat media"
      on storage.objects for select
      using ( bucket_id = 'chat_media' );
  end if;
end $$;

-- Allow authenticated users to upload to chat_media
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated can upload chat media'
  ) then
    create policy "Authenticated can upload chat media"
      on storage.objects for insert
      with check ( bucket_id = 'chat_media' and auth.role() = 'authenticated' );
  end if;
end $$;

-- Allow owners to update their own chat media objects
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Owners can update chat media'
  ) then
    create policy "Owners can update chat media"
      on storage.objects for update
      using ( bucket_id = 'chat_media' and auth.uid() = owner );
  end if;
end $$;
