-- Refine Chapters RLS
-- Drop the broad "manage" policy
drop policy if exists "Project participants can manage chapters" on public.chapters;

-- 1. Select (Both can view)
create policy "Project participants can view chapters"
  on public.chapters for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = chapters.project_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

-- 2. Insert (Student ONLY)
create policy "Students can create chapters"
  on public.chapters for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = chapters.project_id
      and projects.student_id = auth.uid()
    )
  );

-- 3. Update (Both - Student content, Supervisor approvals)
-- Ideally we'd separate columns, but for now allow both to update record
create policy "Project participants can update chapters"
  on public.chapters for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = chapters.project_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

-- 4. Delete (Student ONLY)
create policy "Students can delete chapters"
  on public.chapters for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = chapters.project_id
      and projects.student_id = auth.uid()
    )
  );


-- Prevent Students from approving their own projects
create or replace function public.check_project_status_update()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If the user is the student (owner)
  if auth.uid() = old.student_id then
    -- They cannot change status from 'pending_approval' to 'active' or 'completed'
    if old.status != new.status and new.status != 'pending_approval' then
        raise exception 'Students cannot approve their own projects.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_status_update on public.projects;
create trigger on_project_status_update
  before update on public.projects
  for each row execute procedure public.check_project_status_update();
