-- Run after 001_diary_submission.sql.
-- Adds one shared question per calendar day and records how it was created.

alter table public.questions
add column if not exists question_date date;

alter table public.questions
add column if not exists source text not null default 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_source_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
    add constraint questions_source_check
    check (source in ('ai', 'fallback', 'manual'));
  end if;
end
$$;

create unique index if not exists questions_one_per_date
on public.questions (question_date)
where question_date is not null;

create index if not exists questions_recent_dates
on public.questions (question_date desc)
where question_date is not null;
