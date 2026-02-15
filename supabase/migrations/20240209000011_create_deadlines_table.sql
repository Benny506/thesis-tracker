-- Create project_deadlines table
create table if not exists public.project_deadlines (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    title text not null, -- The "note" (e.g., "Chapter 1 Submission")
    due_date timestamptz not null,
    is_completed boolean default false,
    created_at timestamptz default now(),
    created_by uuid references auth.users(id)
);

-- RLS Policies for project_deadlines
alter table public.project_deadlines enable row level security;

-- Student Policies
create policy "Students can view deadlines for their projects"
    on public.project_deadlines for select
    using ( exists (
        select 1 from public.projects
        where projects.id = project_deadlines.project_id
        and projects.student_id = auth.uid()
    ));

create policy "Students can update completion status of their deadlines"
    on public.project_deadlines for update
    using ( exists (
        select 1 from public.projects
        where projects.id = project_deadlines.project_id
        and projects.student_id = auth.uid()
    ))
    with check ( exists (
        select 1 from public.projects
        where projects.id = project_deadlines.project_id
        and projects.student_id = auth.uid()
    ));

-- Supervisor Policies
create policy "Supervisors can view deadlines for assigned projects"
    on public.project_deadlines for select
    using ( exists (
        select 1 from public.projects
        where projects.id = project_deadlines.project_id
        and projects.supervisor_id = auth.uid()
    ));

create policy "Supervisors can create deadlines for assigned projects"
    on public.project_deadlines for insert
    with check ( exists (
        select 1 from public.projects
        where projects.id = project_deadlines.project_id
        and projects.supervisor_id = auth.uid()
    ));

-- Cleanup old columns from projects table (optional, but good for cleanliness)
-- We will keep them for now to avoid breaking running code immediately, but we will stop using them.
-- alter table public.projects drop column if exists chapter_1_deadline;
-- alter table public.projects drop column if exists deadline_source;
