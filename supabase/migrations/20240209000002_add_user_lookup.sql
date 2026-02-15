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
