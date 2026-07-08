-- AdPilot — Supabase schema
-- Run in the Supabase SQL editor. Auth is handled by Supabase Auth (auth.users);
-- `profiles` extends it with business details.

create extension if not exists "pgcrypto";

-- Users (profile data layered on Supabase Auth)
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  business_name text,
  industry      text,
  created_at    timestamptz not null default now()
);

-- Campaigns
create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  budget            integer not null check (budget between 100 and 5000),
  industry_text     text not null,
  targeting_json    jsonb not null default '{}'::jsonb,
  ad_copy_json      jsonb not null default '{}'::jsonb,
  platform_statuses jsonb not null default '{"google":"draft","meta":"draft","reddit":"draft"}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists campaigns_user_id_idx on public.campaigns (user_id, created_at desc);

-- Row Level Security: users only see their own data
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own campaigns" on public.campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
