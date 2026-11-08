-- IWACU RWANDA — Durable browser push subscriptions and delivery outbox.
-- Additive schema only. This file is NOT applied to Production by this change.
begin;
create table if not exists public.location_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  expiration_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint location_push_endpoint_https check (endpoint ~ '^https://')
);
create index if not exists location_push_subscriptions_visitor_idx
  on public.location_push_subscriptions(visitor_id, last_seen_at desc);

create table if not exists public.location_push_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  event_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 600),
  notification_tag text not null check (char_length(notification_tag) between 1 and 100),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'no_subscription')),
  attempts smallint not null default 0 check (attempts between 0 and 10),
  last_status_code integer,
  last_error_code text,
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  unique(visitor_id, event_id)
);
create index if not exists location_push_events_pending_idx
  on public.location_push_events(status, created_at)
  where status = 'pending';
create index if not exists location_push_events_visitor_created_idx
  on public.location_push_events(visitor_id, created_at desc);

alter table public.location_push_subscriptions enable row level security;
alter table public.location_push_events enable row level security;
revoke all on table public.location_push_subscriptions, public.location_push_events
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.location_push_subscriptions, public.location_push_events
  to service_role;

comment on table public.location_push_subscriptions is
  'Private browser Push API endpoints and encryption keys. Only the IWACU server role may read or write these capability URLs and keys.';
comment on table public.location_push_events is
  'Durable per-device notification history and idempotent push outbox. Stores notification copy and delivery state, but no coordinates or personal identity. No automatic retention expiry is applied.';
comment on column public.location_push_subscriptions.endpoint is
  'Secret push capability URL. Never return to a browser or log it.';
comment on column public.location_push_subscriptions.p256dh_key is
  'Browser Push API encryption public key. Stored server-side only.';
comment on column public.location_push_subscriptions.auth_key is
  'Browser Push API authentication secret. Stored server-side only.';
commit;
