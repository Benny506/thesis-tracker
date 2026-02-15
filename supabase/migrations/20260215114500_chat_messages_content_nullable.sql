-- Align legacy content column with new 1v1 chat schema
-- New chat flow uses body/text fields instead of content.

-- Make content nullable so inserts that omit it do not fail
alter table public.messages
  alter column content drop not null;

