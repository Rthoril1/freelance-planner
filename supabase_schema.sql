-- ==============================================================================
-- SUPABASE SQL SCHEMA FOR FREELANCE PLANNER
-- Pega y ejecuta esto en el "SQL Editor" de tu Dashboard de Supabase.
-- ==============================================================================

-- 1. Profiles Table (Extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  type text,
  phone text,
  "weeklyHoursAvailable" integer,
  "workDays" jsonb,
  "dailyAvailability" jsonb,
  "maxHoursPerDay" integer,
  "preferredBlocks" jsonb,
  "lunchTime" jsonb,
  "customBreaks" jsonb,
  "avatarUrl" text,
  "vacationDays" jsonb default '[]'::jsonb,
  "customPlatforms" jsonb default '[]'::jsonb,
  "hiddenPresetIds" jsonb default '[]'::jsonb,
  "platformsInitialized" boolean default false
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Function and trigger to auto-create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, name, type, "weeklyHoursAvailable", "workDays", "dailyAvailability", "maxHoursPerDay")
  values (new.id, new.raw_user_meta_data->>'full_name', 'Freelancer', 40, '[1,2,3,4,5]', '{"start": "09:00", "end": "18:00"}', 8);
  return new;
end;
$$ language plpgsql security definer;

-- Run trigger on new auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Companies Table
create table public.companies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  color text,
  status text,
  priority text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.companies enable row level security;
create policy "Users manage own companies" on companies for all using (auth.uid() = user_id);

-- Optional: Run these commands if upgrading an existing 'companies' table
alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists banner_url text;
alter table public.companies add column if not exists hourly_rate numeric default 0;
alter table public.companies add column if not exists currency_code text default 'USD';
alter table public.companies add column if not exists "contractHours" numeric default 0;


-- 3. Projects Table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  "startDate" timestamp with time zone,
  "dueDate" timestamp with time zone,
  status text,
  color text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;
create policy "Users manage own projects" on projects for all using (auth.uid() = user_id);


-- 4. Tasks Table
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  type text,
  priority text,
  "estimatedDuration" numeric,
  "energyLevel" text,
  notes text,
  status text,
  "scheduledStart" timestamp with time zone,
  "scheduledEnd" timestamp with time zone,
  "platformId" text,
  frequency jsonb,
  "parent_task_id" uuid references public.tasks(id) on delete cascade,
  "completedAt" timestamp with time zone,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;
create policy "Users manage own tasks" on tasks for all using (auth.uid() = user_id);

-- 5. Storage Buckets for Images
insert into storage.buckets (id, name, public) values ('profile_assets', 'profile_assets', true);
create policy "Public Access" on storage.objects for select using ( bucket_id = 'profile_assets' );
create policy "Auth Insert" on storage.objects for insert with check ( bucket_id = 'profile_assets' and auth.role() = 'authenticated' );
create policy "Auth Update" on storage.objects for update using ( bucket_id = 'profile_assets' and auth.role() = 'authenticated' );
create policy "Auth Delete" on storage.objects for delete using ( bucket_id = 'profile_assets' and auth.role() = 'authenticated' );
