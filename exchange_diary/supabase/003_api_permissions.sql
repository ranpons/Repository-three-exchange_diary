-- Run after 001_diary_submission.sql and 002_ai_questions.sql.
-- Grants only the table privileges required by the current application.
-- Row Level Security remains enabled and continues to restrict user access.

grant usage on schema public to authenticated, service_role;

-- Signed-in users may read open questions through the RLS policy created in 001.
grant select on table public.questions to authenticated;

-- The server-only Supabase client creates and reuses one daily question.
grant select, insert on table public.questions to service_role;

-- Signed-in users may read only their own entries through the RLS policy in 001.
grant select on table public.entries to authenticated;
