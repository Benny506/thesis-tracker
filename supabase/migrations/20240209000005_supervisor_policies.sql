-- Allow Supervisors to update projects assigned to them
drop policy if exists "Supervisors can update assigned projects" on projects;
create policy "Supervisors can update assigned projects"
  on projects for update
  using ( auth.uid() = supervisor_id );
