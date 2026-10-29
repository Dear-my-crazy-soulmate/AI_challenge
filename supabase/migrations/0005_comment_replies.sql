-- Replies to comments (대댓글), one level deep: parent_id is the top-level comment being answered.
-- Run in the Supabase SQL Editor after 0001-0004, before deploying the code that writes replies.
-- Top-level comments keep working before this runs; only replies need it.

alter table public.community_comments
  add column if not exists parent_id text references public.community_comments (id) on delete cascade;
create index if not exists community_comments_parent on public.community_comments (parent_id);

grant insert (parent_id) on public.community_comments to authenticated;

-- new column goes last so `create or replace view` can keep the existing ones
create or replace view public.community_comments_public with (security_invoker = off) as
  select id, post_id, body, badge, created_at, (author_id = auth.uid()) as mine, parent_id
  from public.community_comments;
