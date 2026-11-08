-- Rollback for 20261108_01_location_web_push.sql.
begin;
drop table if exists public.location_push_events;
drop table if exists public.location_push_subscriptions;
commit;
