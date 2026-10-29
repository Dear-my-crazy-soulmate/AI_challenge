-- Best 체험 문제 result per major for each account, so the stars follow the user to another device.
-- Run in the Supabase SQL Editor after 0001 and 0002.

create table if not exists public.quiz_best (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  major       text not null check (char_length(major) between 1 and 100),
  score       int  not null check (score >= 0),
  n           int  not null check (n between 1 and 50),
  updated_at  timestamptz not null default now(),
  primary key (user_id, major),
  check (score <= n)
);

alter table public.quiz_best enable row level security;
revoke all on public.quiz_best from anon;
grant select, insert, update on public.quiz_best to authenticated;

drop policy if exists "quiz_best: own rows" on public.quiz_best;
create policy "quiz_best: own rows" on public.quiz_best
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
