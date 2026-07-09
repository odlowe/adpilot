-- AdPilot — database schema
-- Paste this whole file into the Supabase SQL Editor and click Run (once).
--
-- The app connects with the service-role key from its own server, so
-- row-level security is enabled with no public policies: nobody can read
-- this data except the app itself.

create extension if not exists "pgcrypto";

-- Accounts
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  full_name     text not null default '',
  birthdate     text,
  billing_json  jsonb,
  email_prefs   jsonb not null default '{"enabled":true,"digestFrequency":"weekly"}'::jsonb,
  failed_logins integer not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now()
);

-- Password reset tokens (short-lived, single use)
create table if not exists public.password_resets (
  token      text primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  expires_at timestamptz not null
);

-- Businesses: one account can own several
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  name        text not null,
  category    text not null default 'Other',
  description text not null default '',
  address     text not null default '',
  phone       text not null default '',
  website     text not null default '',
  created_at  timestamptz not null default now()
);

-- Campaigns
create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  business_id       uuid not null references public.businesses (id) on delete cascade,
  name              text not null default '',
  budget            integer not null check (budget between 250 and 5000),
  zip               text not null default '',
  duration_months   integer not null default 1 check (duration_months between 1 and 6),
  continuous        boolean not null default false,
  manual_mode       boolean not null default false,
  platform_split    jsonb not null default '{"google":34,"meta":33,"reddit":33}'::jsonb,
  site_categories   jsonb not null default '[]'::jsonb,
  custom_sites      jsonb not null default '[]'::jsonb,
  creative_url      text,
  industry_text     text not null,
  targeting_json    jsonb not null default '{}'::jsonb,
  ad_copy_json      jsonb not null default '{}'::jsonb,
  platform_statuses jsonb not null default '{"google":"draft","meta":"draft","reddit":"draft"}'::jsonb,
  status            text not null default 'active' check (status in ('active','paused','completed')),
  start_date        timestamptz not null default now(),
  end_date          timestamptz,
  is_sample         boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists businesses_user_id_idx on public.businesses (user_id, created_at);
create index if not exists campaigns_user_id_idx on public.campaigns (user_id, created_at desc);
create index if not exists campaigns_business_id_idx on public.campaigns (business_id, created_at desc);

-- Lock the tables down: no anonymous access. The app's server (service role)
-- bypasses RLS by design.
alter table public.users enable row level security;
alter table public.businesses enable row level security;
alter table public.campaigns enable row level security;
alter table public.password_resets enable row level security;
