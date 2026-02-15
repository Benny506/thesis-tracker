alter table public.profiles
  add column if not exists matric_no text,
  add column if not exists reg_no text;

