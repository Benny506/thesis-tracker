alter table public.chapters drop constraint if exists chapters_status_check;
alter table public.chapters add constraint chapters_status_check 
  check (status in ('pending', 'in_progress', 'submitted', 'changes_requested', 'approved'));
