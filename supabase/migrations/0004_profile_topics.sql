-- 관심 분야 (src/lib/recommend/topics.ts ids) on the profile, used to suggest 다전공 학과.
-- Run in the Supabase SQL Editor after 0001-0003, before deploying the code that saves it.

alter table public.profiles
  add column if not exists topics text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_topics_max;
alter table public.profiles
  add constraint profiles_topics_max check (cardinality(topics) <= 3);
