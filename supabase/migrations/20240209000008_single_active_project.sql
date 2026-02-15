-- Migration for Single Active Project Workflow

-- 1. Add 'stale' to status check constraint
alter table public.projects drop constraint if exists projects_status_check;

alter table public.projects 
add constraint projects_status_check 
check (status in ('pending_approval', 'active', 'completed', 'archived', 'rejected', 'stale'));

-- 2. Trigger Function: Enforce Single Active Project & Auto-Stale
create or replace function public.manage_active_project_status()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Scenario 1: Supervisor Approves a Project (Status becomes 'active')
  if new.status = 'active' and old.status != 'active' then
    -- Check if student already has an active project (prevent race conditions)
    if exists (
        select 1 from public.projects 
        where student_id = new.student_id 
        and status = 'active' 
        and id != new.id
    ) then
        raise exception 'Student already has an active project. Revoke it first.';
    end if;

    -- Automatically mark all other 'pending_approval' projects as 'stale'
    update public.projects
    set status = 'stale'
    where student_id = new.student_id
      and status = 'pending_approval'
      and id != new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_project_approval_stale_others on public.projects;
create trigger on_project_approval_stale_others
  before update on public.projects
  for each row
  execute procedure public.manage_active_project_status();

-- 3. Trigger Function: Block Creation if Active Project Exists
create or replace function public.check_creation_allowed()
returns trigger
language plpgsql
security definer
as $$
begin
  if exists (
    select 1 from public.projects 
    where student_id = new.student_id 
    and status = 'active'
  ) then
    raise exception 'Cannot create new proposal while you have an active project.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_creation_check_active on public.projects;
create trigger on_project_creation_check_active
  before insert on public.projects
  for each row
  execute procedure public.check_creation_allowed();
