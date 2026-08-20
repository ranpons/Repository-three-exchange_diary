-- Run this file in Supabase Dashboard > SQL Editor before enabling production mode.
-- It creates the diary submission tables, a private image bucket, and an atomic
-- function that pairs a new entry with the only waiting entry for the question.

create extension if not exists pgcrypto;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(trim(body)) > 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  image_path text,
  status text not null default 'waiting' check (status in ('waiting', 'matched')),
  created_at timestamptz not null default now(),
  unique (question_id, author_id)
);

create table if not exists public.exchanges (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  first_entry_id uuid not null unique references public.entries(id) on delete cascade,
  second_entry_id uuid not null unique references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (first_entry_id <> second_entry_id)
);

alter table public.questions enable row level security;
alter table public.entries enable row level security;
alter table public.exchanges enable row level security;

drop policy if exists "Read open questions" on public.questions;
create policy "Read open questions"
on public.questions for select to authenticated
using (status = 'open');

drop policy if exists "Read own entries" on public.entries;
create policy "Read own entries"
on public.entries for select to authenticated
using (author_id = auth.uid());

-- No insert, update, or delete policy is granted to users. All submissions
-- pass through the function below, so entries remain immutable after posting.

insert into storage.buckets (id, name, public)
values ('diary-images', 'diary-images', false)
on conflict (id) do nothing;

drop policy if exists "Upload own diary image" on storage.objects;
create policy "Upload own diary image"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'diary-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Read own diary image" on storage.objects;
create policy "Read own diary image"
on storage.objects for select to authenticated
using (
  bucket_id = 'diary-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create or replace function public.submit_entry_and_match(
  p_question_id uuid,
  p_body text,
  p_image_path text default null
)
returns table(status text, exchange_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  waiting_entry_id uuid;
  submitted_entry_id uuid;
  new_exchange_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if char_length(trim(p_body)) not between 1 and 500 then
    raise exception 'INVALID_ENTRY_BODY';
  end if;

  if p_image_path is not null
     and p_image_path not like auth.uid()::text || '/%' then
    raise exception 'INVALID_IMAGE_PATH';
  end if;

  if not exists (
    select 1
    from public.questions as question_row
    where question_row.id = p_question_id
      and question_row.status = 'open'
  ) then
    raise exception 'QUESTION_NOT_OPEN';
  end if;

  -- One advisory lock per question keeps two simultaneous submissions from
  -- matching against the same waiting diary.
  perform pg_advisory_xact_lock(hashtextextended(p_question_id::text, 0));

  if exists (
    select 1
    from public.entries
    where question_id = p_question_id and author_id = auth.uid()
  ) then
    return query select 'already_submitted'::text, null::uuid;
    return;
  end if;

  select id
  into waiting_entry_id
  from public.entries as waiting_entry
  where waiting_entry.question_id = p_question_id
    and waiting_entry.status = 'waiting'
  order by waiting_entry.created_at asc
  limit 1
  for update skip locked;

  if waiting_entry_id is null then
    insert into public.entries (question_id, author_id, body, image_path, status)
    values (p_question_id, auth.uid(), trim(p_body), p_image_path, 'waiting')
    returning id into submitted_entry_id;

    return query select 'waiting'::text, null::uuid;
    return;
  end if;

  insert into public.entries (question_id, author_id, body, image_path, status)
  values (p_question_id, auth.uid(), trim(p_body), p_image_path, 'matched')
  returning id into submitted_entry_id;

  update public.entries
  set status = 'matched'
  where id = waiting_entry_id;

  insert into public.exchanges (question_id, first_entry_id, second_entry_id)
  values (p_question_id, waiting_entry_id, submitted_entry_id)
  returning id into new_exchange_id;

  return query select 'matched'::text, new_exchange_id;
end;
$$;

revoke all on function public.submit_entry_and_match(uuid, text, text) from public;
grant execute on function public.submit_entry_and_match(uuid, text, text) to authenticated;

-- Temporary development question. Replace this through the question-management feature.
insert into public.questions (id, body, status)
values (
  '11111111-1111-4111-8111-111111111111',
  '今日、心に残ったことを一つだけ教えてください。',
  'open'
)
on conflict (id) do nothing;
