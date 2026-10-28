-- Community posts/comments and courses a user has taken.
-- Run once in the Supabase dashboard (SQL Editor -> New query -> paste -> Run), after 0001_profiles.sql.
--
-- Posts are anonymous to readers: the author's id stays in the base tables, which nobody can
-- select directly. Readers use the community_* views, which show only `mine` (true for your own
-- rows) instead of the author id. Writes go to the base tables and RLS ties them to auth.uid().

-- ---------- community ----------
create table if not exists public.community_posts (
  id          text primary key check (char_length(id) between 3 and 64),
  author_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null check (type in ('info', 'question')),
  dept        text not null check (char_length(dept) between 1 and 60),
  category    text check (category in ('curriculum', 'culture', 'clubs', 'career', 'multimajor')),
  title       text not null check (char_length(title) between 1 and 60),
  body        text not null check (char_length(body) <= 2000),
  fields      jsonb not null default '{}'::jsonb,
  badge       jsonb not null,
  created_at  timestamptz not null default now(),
  check (type <> 'info' or category is not null)
);

create table if not exists public.community_comments (
  id          text primary key check (char_length(id) between 3 and 64),
  post_id     text not null references public.community_posts (id) on delete cascade,
  author_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  badge       jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists community_comments_post on public.community_comments (post_id);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

-- Signed-in users write and delete only their own rows. No direct reads (see the views).
revoke all on public.community_posts, public.community_comments from anon, authenticated;
grant insert (id, type, dept, category, title, body, fields, badge) on public.community_posts to authenticated;
grant insert (id, post_id, body, badge) on public.community_comments to authenticated;
grant select (id), delete on public.community_posts, public.community_comments to authenticated;

drop policy if exists "posts: insert own" on public.community_posts;
create policy "posts: insert own" on public.community_posts
  for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "posts: delete own" on public.community_posts;
create policy "posts: delete own" on public.community_posts
  for delete to authenticated using (author_id = auth.uid());
drop policy if exists "posts: see own id" on public.community_posts;
create policy "posts: see own id" on public.community_posts
  for select to authenticated using (author_id = auth.uid());

drop policy if exists "comments: insert own" on public.community_comments;
create policy "comments: insert own" on public.community_comments
  for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "comments: delete own" on public.community_comments;
create policy "comments: delete own" on public.community_comments
  for delete to authenticated using (author_id = auth.uid());
drop policy if exists "comments: see own id" on public.community_comments;
create policy "comments: see own id" on public.community_comments
  for select to authenticated using (author_id = auth.uid());

-- Everyone (also signed out) can read posts, without the author id.
-- security_invoker = off: the view reads the base table with its owner's rights,
-- which is what lets readers see every row while the base table stays closed.
create or replace view public.community_posts_public with (security_invoker = off) as
  select id, type, dept, category, title, body, fields, badge, created_at,
         (author_id = auth.uid()) as mine
  from public.community_posts;

create or replace view public.community_comments_public with (security_invoker = off) as
  select id, post_id, body, badge, created_at, (author_id = auth.uid()) as mine
  from public.community_comments;

grant select on public.community_posts_public, public.community_comments_public to anon, authenticated;

-- ---------- courses a user has taken ----------
create table if not exists public.taken_courses (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code        text not null check (code ~ '^[A-Za-z]{2,6}[0-9]{3,5}[A-Za-z]?$'),
  created_at  timestamptz not null default now(),
  primary key (user_id, code)
);

alter table public.taken_courses enable row level security;
revoke all on public.taken_courses from anon;
grant select, insert, delete on public.taken_courses to authenticated;

drop policy if exists "taken: own rows" on public.taken_courses;
create policy "taken: own rows" on public.taken_courses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
