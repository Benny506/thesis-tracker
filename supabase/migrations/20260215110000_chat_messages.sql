-- Messages table for 1v1 supervisor-student chat

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid()
);

alter table public.messages
  add column if not exists client_id uuid,
  add column if not exists sender_id uuid,
  add column if not exists receiver_id uuid,
  add column if not exists body text,
  add column if not exists type text,
  add column if not exists status text,
  add column if not exists attachment_url text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size_bytes bigint,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.messages
  alter column type set default 'text',
  alter column status set default 'pending';

create index if not exists messages_sender_receiver_created_idx
  on public.messages (sender_id, receiver_id, created_at);

create index if not exists messages_receiver_status_idx
  on public.messages (receiver_id, status);

comment on table public.messages is '1v1 chat messages between student and supervisor';

-- Optional attachments table to support multiple files per message in future

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  url text not null,
  type text not null check (type in ('image','video','document','audio')),
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default timezone('utc', now())
);

create index if not exists message_attachments_message_idx
  on public.message_attachments (message_id);
