-- AdPilot — Supabase schema (multi-tenant)
-- Run in the Supabase SQL editor. Auth is handled by Supabase Auth (auth.users);
-- `profiles` extends it with the account holder's details.

create extension if not exists "pgcrypto";

-- Users (profile data layered on Supabase Auth)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  created_at timestamptz not null default now()
);

-- Businesses: one account can own several
create table if not exists public.businesses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  category   text not null default 'Other',
  created_at timestamptz not null default now()
);

-- Campaigns
create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  business_id       uuid not null references public.businesses (id) on delete cascade,
  name              text not null default '',
  budget            integer not null check (budget between 250 and 5000),
  zip               text not null default '',
  duration_months   integer not null default 1 check (duration_months between 1 and 6),
  continuous        boolean not null default false,
  industry_text     text not null,
  targeting_json    jsonb not null default '{}'::jsonb,
  ad_copy_json      jsonb not null default '{}'::jsonb,
  platform_statuses jsonb not null default '{"google":"draft","meta":"draft","reddit":"draft"}'::jsonb,
  status            text not null default 'active' check (status in ('active','completed')),
  start_date        timestamptz not null default now(),
  end_date          timestamptz,
  is_sample         boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists businesses_user_id_idx on public.businesses (user_id, created_at);
create index if not exists campaigns_user_id_idx on public.campaigns (user_id, created_at desc);
create index if not exists campaigns_business_id_idx on public.campaigns (business_id, created_at desc);

-- Row Level Security: users only see their own data
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.campaigns enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own businesses" on public.businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own campaigns" on public.campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
