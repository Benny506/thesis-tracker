-- Archive old chapter_comments schema and introduce context-based comments

-- 1) Archive existing chapter_comments structure and data
create table if not exists public.chapter_comments_archive
  (like public.chapter_comments including all);

insert into public.chapter_comments_archive
select c.*
from public.chapter_comments c
where not exists (
  select 1
  from public.chapter_comments_archive a
  where a.id = c.id
);

-- 2) New context-based comment table
create table if not exists public.chapter_comments_context (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null,
  author_id uuid not null,
  body text,
  exact_match text not null,
  prefix text,
  suffix text,
  pos_start integer,
  pos_end integer,
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz
);

create index if not exists chapter_comments_context_chapter_created_idx
  on public.chapter_comments_context (chapter_id, created_at desc);

