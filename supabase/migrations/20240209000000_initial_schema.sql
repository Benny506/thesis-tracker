-- Create Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  role text check (role in ('student', 'supervisor')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (safe to run multiple times)
alter table public.profiles enable row level security;

-- Create Policies (Drop first to ensure idempotency)
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create Projects Table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.profiles(id) not null unique,
  supervisor_id uuid references public.profiles(id),
  title text not null,
  description text,
  status text check (status in ('active', 'completed', 'archived')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.projects enable row level security;

drop policy if exists "Students can view own project" on projects;
create policy "Students can view own project"
  on projects for select
  using ( auth.uid() = student_id );

drop policy if exists "Supervisors can view assigned projects" on projects;
create policy "Supervisors can view assigned projects"
  on projects for select
  using ( auth.uid() = supervisor_id );

-- Create Trigger for New User
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'role');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
