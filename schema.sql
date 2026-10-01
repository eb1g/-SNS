create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name text not null default 'きつね',
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_url text,
  banner_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_pro boolean not null default false,
  is_suspended boolean not null default false,
  has_posted boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_casefold_idx on public.profiles (lower(username));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 500),
  image_url text,
  created_at timestamptz not null default now(),
  constraint post_has_content check (char_length(trim(content)) > 0 or image_url is not null)
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.custom_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag_name text not null check (char_length(tag_name) between 1 and 24),
  created_at timestamptz not null default now(),
  unique (user_id, tag_name)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx on public.posts (user_id);

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  requested_username text;
begin
  requested_username := coalesce(new.raw_user_meta_data ->> 'username', 'fox_' || left(new.id::text, 8));
  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, coalesce(new.raw_user_meta_data ->> 'display_name', 'きつね'))
  on conflict do nothing;
  if not exists (select 1 from public.profiles where id = new.id) then
    insert into public.profiles (id, username, display_name)
    values (new.id, 'fox_' || left(new.id::text, 12), coalesce(new.raw_user_meta_data ->> 'display_name', 'きつね'))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_suspended()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_suspended from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.mark_posted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set has_posted = true where id = new.user_id;
  return new;
end;
$$;
drop trigger if exists on_post_created on public.posts;
create trigger on_post_created after insert on public.posts
for each row execute procedure public.mark_posted();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.custom_tags enable row level security;

create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id and not public.is_suspended()) with check (auth.uid() = id and not public.is_suspended());
create policy "Admins update profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());
revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, avatar_url, banner_url) on public.profiles to authenticated;
create policy "Posts are publicly readable" on public.posts for select using (true);
create policy "Active users create posts" on public.posts for insert with check (auth.uid() = user_id and not public.is_suspended());
create policy "Owners and admins delete posts" on public.posts for delete using (auth.uid() = user_id or public.is_admin());
create policy "Likes are publicly readable" on public.likes for select using (true);
create policy "Users manage own likes" on public.likes for insert with check (auth.uid() = user_id and not public.is_suspended());
create policy "Users remove own likes" on public.likes for delete using (auth.uid() = user_id or public.is_admin());
create policy "Tags are publicly readable" on public.custom_tags for select using (true);
create policy "Admins manage tags" on public.custom_tags for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('banners', 'banners', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif']),
  ('post-images', 'post-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "Public image access" on storage.objects for select using (bucket_id in ('avatars','banners','post-images'));
create policy "Users upload own images" on storage.objects for insert to authenticated with check (
  bucket_id in ('avatars','banners','post-images') and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Users update own images" on storage.objects for update to authenticated using (
  bucket_id in ('avatars','banners','post-images') and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Users delete own images" on storage.objects for delete to authenticated using (
  bucket_id in ('avatars','banners','post-images') and (storage.foldername(name))[1] = auth.uid()::text
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then
      execute 'alter publication supabase_realtime add table public.posts';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'likes') then
      execute 'alter publication supabase_realtime add table public.likes';
    end if;
  end if;
end;
$$;
