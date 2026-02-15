alter table public.chapter_comments
  add column if not exists selected_text text;

