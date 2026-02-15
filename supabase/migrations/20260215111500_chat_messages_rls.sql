-- Adjust RLS policies for 1v1 chat messages

-- Drop legacy project-based policies if they exist
drop policy if exists "Project participants can view messages"
  on public.messages;

drop policy if exists "Project participants can send messages"
  on public.messages;

-- Allow chat participants to view their messages
create policy "Chat participants can view messages"
  on public.messages for select
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
  );

-- Allow a user to insert messages only as themselves
create policy "Chat participants can insert messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
  );

-- Allow participants to update message metadata (status, deleted_at, etc.)
create policy "Chat participants can update messages"
  on public.messages for update
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
  )
  with check (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
  );

