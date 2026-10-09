-- Private inbox for Lernova support messages.
-- Run this file once in Supabase SQL Editor after the existing schema.sql.

create table if not exists public.support_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('suggestion', 'problem', 'complaint', 'other')),
  body text not null check (char_length(btrim(body)) between 8 and 2000),
  sender_email text check (sender_email is null or char_length(sender_email) <= 254),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'read', 'resolved'))
);

alter table public.support_admins enable row level security;
alter table public.support_messages enable row level security;

-- The admin list is managed only in Supabase SQL Editor by the project owner.
revoke all on public.support_admins from anon, authenticated;
revoke all on public.support_messages from anon, authenticated;
grant insert on public.support_messages to anon, authenticated;
grant select on public.support_messages to authenticated;
grant update (status) on public.support_messages to authenticated;

create or replace function public.lernova_is_support_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.support_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.lernova_is_support_admin() from public;
grant execute on function public.lernova_is_support_admin() to authenticated;

drop policy if exists "Support messages can be submitted" on public.support_messages;
create policy "Support messages can be submitted"
on public.support_messages for insert to anon, authenticated
with check (user_id is null or user_id = (select auth.uid()));

drop policy if exists "Support admins can read messages" on public.support_messages;
create policy "Support admins can read messages"
on public.support_messages for select to authenticated
using ((select public.lernova_is_support_admin()));

drop policy if exists "Support admins can update message status" on public.support_messages;
create policy "Support admins can update message status"
on public.support_messages for update to authenticated
using ((select public.lernova_is_support_admin()))
with check ((select public.lernova_is_support_admin()));

notify pgrst, 'reload schema';
