-- Add body (for rich text JSON) and last_edited_at to chapters table
alter table public.chapters add column if not exists body jsonb default '{}'::jsonb;
alter table public.chapters add column if not exists last_edited_at timestamptz default now();
alter table public.chapters add column if not exists last_edited_by uuid references public.profiles(id);

-- Create storage bucket for chapter images if not exists
insert into storage.buckets (id, name, public)
values ('chapter-images', 'chapter-images', true)
on conflict (id) do nothing;

-- Storage Policies for chapter-images
create policy "Project participants can view chapter images"
  on storage.objects for select
  using ( bucket_id = 'chapter-images' ); -- Simplifying read access for now, or we can enforce project membership if needed.

create policy "Authenticated users can upload chapter images"
  on storage.objects for insert
  with check ( bucket_id = 'chapter-images' and auth.role() = 'authenticated' );

create policy "Users can update their own images"
  on storage.objects for update
  using ( bucket_id = 'chapter-images' and auth.uid() = owner );
