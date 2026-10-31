-- AI Fitness Coach - Supabase schema (staging)
-- 1. Create a project at https://supabase.com (free tier is enough).
-- 2. Open the SQL Editor, paste this whole file, run it.
-- 3. Copy Project URL + anon public key (Settings -> API) into `.env`:
--      VITE_SUPABASE_URL=https://<project>.supabase.co
--      VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
-- 4. Restart `npm run dev`. localStorage stays the source of truth
--    until you swap the persistence calls (see supabase/README.md).
-- RLS is ENABLED with permissive anon policies for local dev.
-- Tighten these (auth.uid() checks) before any production use.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  goal text not null default 'muscle',
  level text not null default 'beginner',
  days_per_week int not null default 3 check (days_per_week between 1 and 7),
  equipment text not null default 'bodyweight',
  sex text not null default 'male',
  age int,
  height_cm numeric,
  weight_kg numeric,
  activity text not null default 'moderate',
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  week_key text not null,
  payload jsonb not null default '{}'::jsonb,
  signature text not null default '',
  variant int not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, week_key, variant)
);
create index if not exists plans_profile_week_idx on public.plans (profile_id, week_key);

create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  week_key text not null,
  day_id text not null,
  completed_at timestamptz not null default now(),
  unique (profile_id, week_key, day_id)
);
create index if not exists completions_profile_week_idx on public.completions (profile_id, week_key);

create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  kg numeric not null check (kg > 0 and kg < 500),
  created_at timestamptz not null default now(),
  unique (profile_id, date)
);
create index if not exists weights_profile_date_idx on public.weights (profile_id, date desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null default '',
  source text not null default 'local',
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_profile_created_idx on public.chat_messages (profile_id, created_at);

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.completions enable row level security;
alter table public.weights enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "dev_anon_all" on public.profiles;
create policy "dev_anon_all" on public.profiles for all to anon using (true) with check (true);

drop policy if exists "dev_anon_all" on public.plans;
create policy "dev_anon_all" on public.plans for all to anon using (true) with check (true);

drop policy if exists "dev_anon_all" on public.completions;
create policy "dev_anon_all" on public.completions for all to anon using (true) with check (true);

drop policy if exists "dev_anon_all" on public.weights;
create policy "dev_anon_all" on public.weights for all to anon using (true) with check (true);

drop policy if exists "dev_anon_all" on public.chat_messages;
create policy "dev_anon_all" on public.chat_messages for all to anon using (true) with check (true);
