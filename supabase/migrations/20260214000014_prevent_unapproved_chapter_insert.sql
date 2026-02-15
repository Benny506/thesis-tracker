-- Enforce: prevent adding a new chapter if any existing chapter for the project is not approved
create or replace function public.prevent_new_chapter_if_unapproved()
returns trigger
language plpgsql
as $$
begin
  -- Allow insert if this is the first chapter for the project
  -- Block if there exists any chapter (excluding the new one) that is not approved
  if exists (
    select 1
    from public.chapters c
    where c.project_id = new.project_id
      and c.status <> 'approved'
  ) then
    raise exception 'Cannot add a new chapter until all existing chapters are approved'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_new_chapter_if_unapproved on public.chapters;
create trigger trg_prevent_new_chapter_if_unapproved
before insert on public.chapters
for each row
execute function public.prevent_new_chapter_if_unapproved();

