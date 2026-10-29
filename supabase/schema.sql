-- Article50 Shield — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`).

-- ============ api_keys ============
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'default',
  -- first 4 hex chars of the random part, for display ("a50_live_ab12…")
  key_prefix text not null,
  -- SHA-256 hex of the full plaintext key. Plaintext is never stored.
  key_hash text not null unique,
  monthly_limit bigint not null default 100000,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_created_at_idx on public.api_keys (created_at desc);

-- ============ usage_logs (audit trail) ============
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.api_keys (id) on delete cascade,
  endpoint text not null,
  is_eu boolean not null default false,
  watermarked boolean not null default false,
  status_code integer not null default 200,
  latency_ms integer not null default 0,
  ip_country text,
  created_at timestamptz not null default now()
);

create index if not exists usage_logs_key_id_created_at_idx
  on public.usage_logs (api_key_id, created_at desc);

-- ============ usage_summary RPC (dashboard usage view) ============
create or replace function public.usage_summary()
returns table (
  api_key_id uuid,
  name text,
  requests bigint,
  eu_requests bigint,
  watermarked bigint,
  last_used_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    k.id as api_key_id,
    k.name,
    count(l.id) as requests,
    count(l.id) filter (where l.is_eu) as eu_requests,
    count(l.id) filter (where l.watermarked) as watermarked,
    max(l.created_at) as last_used_at
  from public.api_keys k
  left join public.usage_logs l on l.api_key_id = k.id
  group by k.id, k.name
  order by k.created_at desc;
$$;

-- ============ Row Level Security ============
-- The app talks to PostgREST with the service-role key, which bypasses RLS.
-- RLS is enabled so that any future anon/authenticated access is locked down
-- by default: nobody can read keys or logs without the service role.
alter table public.api_keys enable row level security;
alter table public.usage_logs enable row level security;

-- No public policies on purpose: service-role only. If you later add
-- user-facing auth, add policies scoped to auth.uid() here, e.g.:
--
-- create policy "users read own keys"
--   on public.api_keys for select
--   using (auth.uid() = owner_id);

-- ============ grants ============
revoke all on public.api_keys from anon, authenticated;
revoke all on public.usage_logs from anon, authenticated;
grant execute on function public.usage_summary() to service_role;
