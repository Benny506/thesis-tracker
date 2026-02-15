-- Remove legacy project_id linkage from messages table now that chat is pure 1v1

-- Drop index that depends on project_id, if it exists
drop index if exists idx_messages_project;

-- Drop foreign key constraint on project_id, if it exists
alter table public.messages
  drop constraint if exists messages_project_id_fkey;

-- Finally drop the project_id column itself
alter table public.messages
  drop column if exists project_id;

