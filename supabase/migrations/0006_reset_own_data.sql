-- Start over without deleting the account: removes the signed-in user's own profile,
-- 이수 과목 and 체험 stars. Used by the shared 심사·체험용 account ("처음부터 설정하기" in MY),
-- so each judge can set it up from scratch. Community posts are left alone (others may be reading them).
-- Run once in the Supabase SQL Editor.
create or replace function public.reset_own_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from public.taken_courses where user_id = auth.uid();
  delete from public.quiz_best where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
end;
$$;

revoke all on function public.reset_own_data() from public, anon;
grant execute on function public.reset_own_data() to authenticated;
