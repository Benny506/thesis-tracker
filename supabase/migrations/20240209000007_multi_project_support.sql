-- Multi-Project Support Migration

-- 1. Remove unique constraint on student_id to allow multiple projects
alter table public.projects drop constraint if exists projects_student_id_key;

-- 2. Add rejection_reason column
alter table public.projects add column if not exists rejection_reason text;

-- 3. Update Status Constraint to include 'rejected'
alter table public.projects drop constraint if exists projects_status_check;

alter table public.projects 
add constraint projects_status_check 
check (status in ('pending_approval', 'active', 'completed', 'archived', 'rejected'));

-- 4. Ensure RLS policies support multiple projects
-- Drop existing policies to be safe and recreate them
drop policy if exists "Students can create own project" on projects;
create policy "Students can create own project"
  on projects for insert
  with check ( auth.uid() = student_id );

drop policy if exists "Students can view own project" on projects;
create policy "Students can view own project"
  on projects for select
  using ( auth.uid() = student_id );

drop policy if exists "Students can update own project" on projects;
create policy "Students can update own project"
  on projects for update
  using ( auth.uid() = student_id );

-- 5. Update Supervisor Policies
drop policy if exists "Supervisors can view assigned projects" on projects;
create policy "Supervisors can view assigned projects"
  on projects for select
  using ( auth.uid() = supervisor_id );

drop policy if exists "Supervisors can update assigned projects" on projects;
create policy "Supervisors can update assigned projects"
  on projects for update
  using ( auth.uid() = supervisor_id );
