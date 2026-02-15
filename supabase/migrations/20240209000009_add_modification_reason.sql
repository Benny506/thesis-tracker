-- Migration to add modification_reason to projects table
alter table public.projects add column if not exists modification_reason text;
