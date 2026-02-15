-- Review artifacts: chapter_edits (force updates) and chapter_comments (suggestive)
-- Plus chapter flags for quick UI indicators

alter table public.chapters
  add column if not exists has_pending_force_updates boolean not null default false,
  add column if not exists has_unread_comments boolean not null default false;

create table if not exists public.chapter_edits (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  from_pos integer not null,
  to_pos integer not null,
  old_text text not null,
  new_text text not null,
  context_before text,
  context_after text,
  status text not null check (status in ('pending','accepted')) default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table if not exists public.chapter_comments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  from_pos integer not null,
  to_pos integer not null,
  body text not null,
  is_read boolean not null default false,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  resolved_at timestamptz
);

-- Flags maintenance
create or replace function public.refresh_chapter_flags_for(ch_id uuid)
returns void
language sql
as $$
  update public.chapters c set
    has_pending_force_updates = exists (
      select 1 from public.chapter_edits e
      where e.chapter_id = ch_id and e.status = 'pending'
    ),
    has_unread_comments = exists (
      select 1 from public.chapter_comments cm
      where cm.chapter_id = ch_id and cm.is_read = false
    )
  where c.id = ch_id;
$$;

create or replace function public.refresh_chapter_flags_from_edits()
returns trigger
language plpgsql
as $$
declare
  ch_id uuid := coalesce(new.chapter_id, old.chapter_id);
begin
  perform public.refresh_chapter_flags_for(ch_id);
  return null;
end;
$$;

create or replace function public.refresh_chapter_flags_from_comments()
returns trigger
language plpgsql
as $$
declare
  ch_id uuid := coalesce(new.chapter_id, old.chapter_id);
begin
  perform public.refresh_chapter_flags_for(ch_id);
  return null;
end;
$$;

drop trigger if exists trg_refresh_flags_edits_ins on public.chapter_edits;
drop trigger if exists trg_refresh_flags_edits_upd on public.chapter_edits;
drop trigger if exists trg_refresh_flags_edits_del on public.chapter_edits;
create trigger trg_refresh_flags_edits_ins after insert on public.chapter_edits
for each row execute function public.refresh_chapter_flags_from_edits();
create trigger trg_refresh_flags_edits_upd after update on public.chapter_edits
for each row execute function public.refresh_chapter_flags_from_edits();
create trigger trg_refresh_flags_edits_del after delete on public.chapter_edits
for each row execute function public.refresh_chapter_flags_from_edits();

drop trigger if exists trg_refresh_flags_comments_ins on public.chapter_comments;
drop trigger if exists trg_refresh_flags_comments_upd on public.chapter_comments;
drop trigger if exists trg_refresh_flags_comments_del on public.chapter_comments;
create trigger trg_refresh_flags_comments_ins after insert on public.chapter_comments
for each row execute function public.refresh_chapter_flags_from_comments();
create trigger trg_refresh_flags_comments_upd after update on public.chapter_comments
for each row execute function public.refresh_chapter_flags_from_comments();
create trigger trg_refresh_flags_comments_del after delete on public.chapter_comments
for each row execute function public.refresh_chapter_flags_from_comments();

-- RLS
alter table public.chapter_edits enable row level security;
alter table public.chapter_comments enable row level security;

-- Project participants can view edits
create policy "Participants can view edits"
  on public.chapter_edits for select
  using (
    exists (
      select 1 from public.chapters ch
      join public.projects p on p.id = ch.project_id
      where ch.id = chapter_edits.chapter_id
      and (p.student_id = auth.uid() or p.supervisor_id = auth.uid())
    )
  );

-- Supervisor can create edits
create policy "Supervisor can insert edits"
  on public.chapter_edits for insert
  with check (
    exists (
      select 1 from public.chapters ch
      join public.projects p on p.id = ch.project_id
      where ch.id = chapter_edits.chapter_id
      and p.supervisor_id = auth.uid()
    )
  );

-- Student can accept edits
create policy "Student can accept edits"
  on public.chapter_edits for update
  using (
    exists (
      select 1 from public.chapters ch
      join public.projects p on p.id = ch.project_id
      where ch.id = chapter_edits.chapter_id
      and p.student_id = auth.uid()
    )
  )
  with check (status in ('pending','accepted'));

-- Comments policies
create policy "Participants can view comments"
  on public.chapter_comments for select
  using (
    exists (
      select 1 from public.chapters ch
      join public.projects p on p.id = ch.project_id
      where ch.id = chapter_comments.chapter_id
      and (p.student_id = auth.uid() or p.supervisor_id = auth.uid())
    )
  );

create policy "Supervisor can insert comments"
  on public.chapter_comments for insert
  with check (
    exists (
      select 1 from public.chapters ch
      join public.projects p on p.id = ch.project_id
      where ch.id = chapter_comments.chapter_id
      and p.supervisor_id = auth.uid()
    )
  );

create policy "Student can mark read"
  on public.chapter_comments for update
  using (
    exists (
      select 1 from public.chapters ch
      join public.projects p on p.id = ch.project_id
      where ch.id = chapter_comments.chapter_id
      and p.student_id = auth.uid()
    )
  )
  with check (true);

