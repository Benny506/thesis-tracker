-- Migration to add chapter_1_deadline and deadline_source to projects table
alter table public.projects add column if not exists chapter_1_deadline timestamptz;
alter table public.projects add column if not exists deadline_source text check (deadline_source in ('supervisor', 'system'));
