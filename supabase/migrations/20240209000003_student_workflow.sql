-- Create Chapters Table (Milestones)
create table if not exists public.chapters (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  content text, -- Instructions or description
  status text check (status in ('pending', 'in_progress', 'submitted', 'approved')) default 'pending',
  due_date timestamp with time zone,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Submissions Table (Versions)
create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  file_url text not null,
  version integer default 1,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Comments Table (Feedback)
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references public.submissions(id) on delete cascade not null,
  author_id uuid references public.profiles(id) not null,
  content text not null,
  is_resolved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Messages Table (Chat)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.chapters enable row level security;
alter table public.submissions enable row level security;
alter table public.comments enable row level security;
alter table public.messages enable row level security;

-- RLS Policies

-- 1. Chapters
create policy "Users can view chapters of their projects"
  on public.chapters for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = chapters.project_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

-- Only Supervisors should create chapters? Or students too? For now, let's assume Supervisor defines structure, or Student proposes.
-- Let's allow both for flexibility, or maybe check role. For now, strict to project participants.
create policy "Project participants can manage chapters"
  on public.chapters for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = chapters.project_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

-- 2. Submissions
create policy "Project participants can view submissions"
  on public.submissions for select
  using (
    exists (
      select 1 from public.chapters
      join public.projects on projects.id = chapters.project_id
      where chapters.id = submissions.chapter_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

create policy "Students can create submissions"
  on public.submissions for insert
  with check (
    exists (
      select 1 from public.chapters
      join public.projects on projects.id = chapters.project_id
      where chapters.id = submissions.chapter_id
      and projects.student_id = auth.uid()
    )
  );

-- 3. Comments
create policy "Project participants can view comments"
  on public.comments for select
  using (
    exists (
      select 1 from public.submissions
      join public.chapters on chapters.id = submissions.chapter_id
      join public.projects on projects.id = chapters.project_id
      where submissions.id = comments.submission_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

create policy "Project participants can create comments"
  on public.comments for insert
  with check (
    auth.uid() = author_id and
    exists (
      select 1 from public.submissions
      join public.chapters on chapters.id = submissions.chapter_id
      join public.projects on projects.id = chapters.project_id
      where submissions.id = comments.submission_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

create policy "Project participants can update comments (resolve)"
  on public.comments for update
  using (
    exists (
      select 1 from public.submissions
      join public.chapters on chapters.id = submissions.chapter_id
      join public.projects on projects.id = chapters.project_id
      where submissions.id = comments.submission_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

-- 4. Messages
create policy "Project participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = messages.project_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

create policy "Project participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.projects
      where projects.id = messages.project_id
      and (projects.student_id = auth.uid() or projects.supervisor_id = auth.uid())
    )
  );

-- Indexes for performance
create index idx_chapters_project on public.chapters(project_id);
create index idx_submissions_chapter on public.submissions(chapter_id);
create index idx_comments_submission on public.comments(submission_id);
create index idx_messages_project on public.messages(project_id);
