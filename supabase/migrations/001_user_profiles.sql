-- Run this in Supabase: SQL Editor → New query → Run
-- Also add redirect URLs in Authentication → URL Configuration:
--   http://localhost:3000/auth/confirm
--   http://localhost:3000/auth/callback
--   https://your-production-domain/auth/confirm
--   https://your-production-domain/auth/callback

create type public.user_role as enum ('administrator', 'user');

create type public.user_status as enum ('invited', 'active', 'disabled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.user_role not null default 'user',
  status public.user_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_role public.user_role;
begin
  profile_role := coalesce(
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    'user'::public.user_role
  );

  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    profile_role,
    case
      when new.email_confirmed_at is not null then 'active'::public.user_status
      else 'invited'::public.user_status
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "Profiles are readable by service role only"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
