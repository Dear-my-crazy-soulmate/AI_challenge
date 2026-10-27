-- Profiles for signed-in users (src/lib/auth/supabase.ts).
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Personal data (CLAUDE.md rule 4): name and student_id are stored only when the user
-- types them, only in the user's own row, and never sent to an LLM. No contact fields.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  primary_major text not null,
  interests   text[] not null default '{}',
  avatar      text,
  grade       smallint not null default 1 check (grade between 1 and 4),
  name        text not null default '' check (char_length(name) <= 20),
  student_id  text not null default '' check (student_id = '' or student_id ~ '^[0-9]{10}$'),
  updated_at  timestamptz not null default now()
);

-- Row level security: a user can only see and change their own row.
alter table public.profiles enable row level security;

drop policy if exists "own profile: read" on public.profiles;
create policy "own profile: read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile: insert" on public.profiles;
create policy "own profile: insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "own profile: update" on public.profiles;
create policy "own profile: update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Account deletion without a server secret: the function runs with the owner's rights
-- but only ever deletes the caller's own auth user (the profile row goes with it via cascade).
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
