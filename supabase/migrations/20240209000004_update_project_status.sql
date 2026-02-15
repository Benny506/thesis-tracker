-- Update Project Status Check Constraint
alter table public.projects drop constraint if exists projects_status_check;

alter table public.projects 
add constraint projects_status_check 
check (status in ('pending_approval', 'active', 'completed', 'archived'));

-- Update default value
alter table public.projects 
alter column status set default 'pending_approval';

-- Add RLS policy for students to create projects
drop policy if exists "Students can create own project" on projects;
create policy "Students can create own project"
  on projects for insert
  with check ( auth.uid() = student_id );

-- Allow students to update their own project (e.g. while pending)
drop policy if exists "Students can update own project" on projects;
create policy "Students can update own project"
  on projects for update
  using ( auth.uid() = student_id );
