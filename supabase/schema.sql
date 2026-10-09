-- Lernova uses the existing one-row-per-user progress table.
-- Safe to run more than once; it does not delete existing progress.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  streak integer not null default 0,
  last_activity date,
  known_words jsonb not null default '[]'::jsonb,
  review_words jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Adds fields for an older installation without replacing its rows.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.user_progress add column if not exists xp integer not null default 0;
alter table public.user_progress add column if not exists streak integer not null default 0;
alter table public.user_progress add column if not exists last_activity date;
alter table public.user_progress add column if not exists known_words jsonb not null default '[]'::jsonb;
alter table public.user_progress add column if not exists review_words jsonb not null default '[]'::jsonb;
alter table public.user_progress add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "progress own row" on public.user_progress;
create policy "progress own row" on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.lernova_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_progress(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists lernova_on_auth_user_created on auth.users;
create trigger lernova_on_auth_user_created
  after insert on auth.users for each row execute procedure public.lernova_new_user();


-- Public profile photos. Each signed-in user can manage files under their own UUID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar photos are publicly readable" on storage.objects;
create policy "Avatar photos are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "Users upload own avatar photos" on storage.objects;
create policy "Users upload own avatar photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update own avatar photos" on storage.objects;
create policy "Users update own avatar photos" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete own avatar photos" on storage.objects;
create policy "Users delete own avatar photos" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';

-- Extended progress state for account-scoped offline sync.
alter table public.user_progress add column if not exists client_state jsonb not null default '{}'::jsonb;

