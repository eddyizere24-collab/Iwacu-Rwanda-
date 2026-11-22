-- IWACU's own answer store: every general (non-personal) AI answer is kept so the
-- same or a similar question can be answered from our own data, without any outside AI.
-- Stores only the normalised public question text and the answer. No IP, account,
-- phone number, name or location is stored. The route refuses to store questions
-- that contain digits, emails or other personal markers.
-- Additive migration.

begin;

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.assistant_answer_store (
  id bigint generated always as identity primary key,
  lang text not null check (lang in ('rw', 'en', 'fr')),
  norm_question text not null check (char_length(norm_question) between 6 and 400),
  question_sample text not null check (char_length(question_sample) between 3 and 500),
  answer text not null check (char_length(answer) between 1 and 4000),
  source text not null default 'ai' check (source in ('ai', 'web', 'curated')),
  hits integer not null default 0 check (hits >= 0),
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  unique (lang, norm_question)
);

create index if not exists assistant_answer_store_trgm
  on public.assistant_answer_store using gin (norm_question extensions.gin_trgm_ops);

alter table public.assistant_answer_store enable row level security;
revoke all on table public.assistant_answer_store from public, anon, authenticated, service_role;

create or replace function public.lookup_assistant_answer_v1(
  p_lang text,
  p_norm text,
  p_min_similarity real
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $lookup_answer$
declare
  v_id bigint;
  v_answer text;
  v_source text;
  v_sim real := 1;
begin
  if p_lang is null or p_lang not in ('rw', 'en', 'fr')
     or p_norm is null or char_length(p_norm) < 6 or char_length(p_norm) > 400
     or p_min_similarity is null or p_min_similarity < 0.3 or p_min_similarity > 1 then
    return jsonb_build_object('found', false);
  end if;

  select s.id, s.answer, s.source into v_id, v_answer, v_source
  from public.assistant_answer_store s
  where s.lang = p_lang and s.norm_question = p_norm and not s.flagged;

  if v_id is null then
    select s.id, s.answer, s.source, similarity(s.norm_question, p_norm)
      into v_id, v_answer, v_source, v_sim
    from public.assistant_answer_store s
    where s.lang = p_lang and not s.flagged and similarity(s.norm_question, p_norm) >= p_min_similarity
    order by similarity(s.norm_question, p_norm) desc, s.hits desc
    limit 1;
    if v_id is null then
      return jsonb_build_object('found', false);
    end if;
  end if;

  update public.assistant_answer_store
  set hits = hits + 1, last_used_at = now()
  where id = v_id;

  return jsonb_build_object('found', true, 'answer', v_answer, 'similarity', v_sim, 'source', v_source);
end;
$lookup_answer$;

create or replace function public.store_assistant_answer_v1(
  p_lang text,
  p_norm text,
  p_question text,
  p_answer text,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $store_answer$
begin
  if p_lang is null or p_lang not in ('rw', 'en', 'fr')
     or p_norm is null or char_length(p_norm) < 6 or char_length(p_norm) > 400
     or p_question is null or char_length(p_question) < 3 or char_length(p_question) > 500
     or p_answer is null or char_length(p_answer) < 1 or char_length(p_answer) > 4000
     or p_source is null or p_source not in ('ai', 'web', 'curated') then
    return jsonb_build_object('stored', false);
  end if;

  insert into public.assistant_answer_store (lang, norm_question, question_sample, answer, source)
  values (p_lang, p_norm, p_question, p_answer, p_source)
  on conflict (lang, norm_question) do update
    set answer = case when public.assistant_answer_store.flagged then excluded.answer
                      else public.assistant_answer_store.answer end,
        flagged = false,
        last_used_at = now();

  return jsonb_build_object('stored', true);
end;
$store_answer$;

revoke all on function public.lookup_assistant_answer_v1(text, text, real) from public, anon, authenticated, service_role;
revoke all on function public.store_assistant_answer_v1(text, text, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.lookup_assistant_answer_v1(text, text, real) to service_role;
grant execute on function public.store_assistant_answer_v1(text, text, text, text, text) to service_role;

commit;
