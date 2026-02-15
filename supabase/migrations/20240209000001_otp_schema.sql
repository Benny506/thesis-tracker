-- Create a table to store verification codes
create table if not exists public.verification_codes (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  code text not null,
  type text not null check (type in ('signup', 'reset')),
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.verification_codes enable row level security;

-- Only allow service_role (Edge Functions) to access this table
drop policy if exists "Service role can do everything" on public.verification_codes;
create policy "Service role can do everything"
  on public.verification_codes
  for all
  to service_role
  using (true)
  with check (true);

-- Index for faster lookups
create index if not exists idx_verification_codes_email_type on public.verification_codes(email, type);

-- Helper function to get user ID by email (securely)
-- Accessible by service_role (and potentially others if granted, but we keep it default)
create or replace function public.get_user_id_by_email(email_input text)
returns uuid
language plpgsql
security definer
set search_path = public -- Secure search path
as $$
begin
  return (select id from auth.users where email = email_input limit 1);
end;
$$;
