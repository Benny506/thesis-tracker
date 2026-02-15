-- Adds robust anchoring/audit fields for inline comments
-- Safe to run multiple times via IF NOT EXISTS guards

alter table if exists public.chapter_comments
  add column if not exists exact text,
  add column if not exists prefix text,
  add column if not exists suffix text,
  add column if not exists pos_start integer,
  add column if not exists pos_end integer;

create index if not exists chapter_comments_chapter_created_idx
  on public.chapter_comments (chapter_id, created_at desc);

