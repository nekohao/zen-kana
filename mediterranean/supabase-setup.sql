-- Run once in this project's Supabase SQL Editor. Additive, project-prefixed objects only.
-- Use email/password accounts created by the administrator under Authentication > Users.
-- Anonymous Sign-Ins are not required. The kitchen creator is that kitchen's owner.
begin;
-- This is the base schema for new installations only; never restore the v1 RPCs over v2.
do $$ begin
  if to_regclass('mediterranean_private.app_settings') is not null then
    raise exception 'Version 2 is already installed. Do not rerun the base schema; use supabase-upgrade-v2.sql';
  end if;
end $$;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists mediterranean_private;
revoke all on schema mediterranean_private from public, anon, authenticated;

create table if not exists public.med_kitchens (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.med_kitchen_members (
  kitchen_id uuid not null references public.med_kitchens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kitchen_id, user_id)
);
create index if not exists med_members_user_idx on public.med_kitchen_members(user_id);
create table if not exists public.med_inventory (
  kitchen_id uuid not null references public.med_kitchens(id) on delete cascade,
  ingredient text not null check (char_length(btrim(ingredient)) between 1 and 80),
  available boolean not null default true,
  priority boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id),
  primary key (kitchen_id, ingredient),
  check (available or not priority)
);
create table if not exists mediterranean_private.invites (
  kitchen_id uuid primary key references public.med_kitchens(id) on delete cascade,
  code_hash text not null unique
);
create table if not exists mediterranean_private.inventory_operations (
  kitchen_id uuid not null references public.med_kitchens(id) on delete cascade,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (kitchen_id, operation_id)
);
alter table public.med_kitchens enable row level security;
alter table public.med_kitchen_members enable row level security;
alter table public.med_inventory enable row level security;
alter table mediterranean_private.invites enable row level security;
alter table mediterranean_private.inventory_operations enable row level security;
revoke all on public.med_kitchens, public.med_kitchen_members, public.med_inventory from anon, authenticated;
revoke all on all tables in schema mediterranean_private from public, anon, authenticated;
grant select on public.med_kitchens, public.med_kitchen_members, public.med_inventory to authenticated;

create or replace function public.med_is_member(p_kitchen uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.med_kitchen_members where kitchen_id = p_kitchen and user_id = auth.uid()
  );
$$;
drop policy if exists med_kitchens_read on public.med_kitchens;
create policy med_kitchens_read on public.med_kitchens for select to authenticated
  using (public.med_is_member(id));
drop policy if exists med_members_read on public.med_kitchen_members;
create policy med_members_read on public.med_kitchen_members for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists med_inventory_read on public.med_inventory;
create policy med_inventory_read on public.med_inventory for select to authenticated
  using (public.med_is_member(kitchen_id));

-- Per-ingredient changes avoid overwriting someone else's entire inventory.
-- Operation IDs make retries idempotent, including a retry after another member edits.
create or replace function public.med_apply_inventory(p_kitchen uuid, p_changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare item jsonb; ingredient_name text; op uuid; is_available boolean; is_priority boolean;
begin
  if not public.med_is_member(p_kitchen) then raise exception 'Not a kitchen member' using errcode = '42501'; end if;
  if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) > 500
    then raise exception 'Invalid change list'; end if;
  for item in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(item->'name') is distinct from 'string'
      or jsonb_typeof(item->'available') is distinct from 'boolean'
      or jsonb_typeof(item->'priority') is distinct from 'boolean'
      then raise exception 'Invalid ingredient change'; end if;
    ingredient_name := btrim(item->>'name');
    if char_length(ingredient_name) not between 1 and 80 then raise exception 'Invalid ingredient name'; end if;
    op := (item->>'operationId')::uuid;
    if op is null then raise exception 'Missing operation ID'; end if;
    is_available := (item->>'available')::boolean;
    is_priority := is_available and (item->>'priority')::boolean;
    insert into mediterranean_private.inventory_operations(kitchen_id, operation_id)
      values (p_kitchen, op) on conflict do nothing;
    if not found then continue; end if;
    insert into public.med_inventory(kitchen_id, ingredient, available, priority, updated_by)
      values (p_kitchen, ingredient_name, is_available, is_priority, auth.uid())
      on conflict (kitchen_id, ingredient) do update set available = excluded.available,
        priority = excluded.priority, updated_by = excluded.updated_by, updated_at = now();
  end loop;
end;
$$;

create or replace function public.med_create_kitchen(p_name text, p_items jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare kitchen uuid; code text;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if (select count(*) from public.med_kitchens where owner_id = auth.uid()) >= 5
    then raise exception 'Kitchen limit reached'; end if;
  insert into public.med_kitchens(name, owner_id) values (btrim(p_name), auth.uid()) returning id into kitchen;
  insert into public.med_kitchen_members(kitchen_id, user_id) values (kitchen, auth.uid());
  code := upper(encode(extensions.gen_random_bytes(16), 'hex'));
  insert into mediterranean_private.invites(kitchen_id, code_hash)
    values (kitchen, encode(extensions.digest(code, 'sha256'), 'hex'));
  perform public.med_apply_inventory(kitchen, p_items);
  return jsonb_build_object('id', kitchen, 'name', btrim(p_name), 'code', code);
end;
$$;

create or replace function public.med_join_kitchen(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare kitchen uuid; kitchen_name text; code text;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  code := upper(regexp_replace(p_code, '[[:space:]-]', '', 'g'));
  if code !~ '^[A-F0-9]{32}$' then raise exception 'Invalid invitation code'; end if;
  select k.id, k.name into kitchen, kitchen_name from mediterranean_private.invites i
    join public.med_kitchens k on k.id = i.kitchen_id
    where i.code_hash = encode(extensions.digest(code, 'sha256'), 'hex');
  if kitchen is null then raise exception 'Invalid invitation code'; end if;
  insert into public.med_kitchen_members(kitchen_id, user_id) values (kitchen, auth.uid()) on conflict do nothing;
  return jsonb_build_object('id', kitchen, 'name', kitchen_name);
end;
$$;

create or replace function public.med_leave_kitchen(p_kitchen uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  delete from public.med_kitchen_members where kitchen_id = p_kitchen and user_id = auth.uid();
end;
$$;

revoke all on function public.med_is_member(uuid) from public, anon;
revoke all on function public.med_apply_inventory(uuid, jsonb) from public, anon;
revoke all on function public.med_create_kitchen(text, jsonb) from public, anon;
revoke all on function public.med_join_kitchen(text) from public, anon;
revoke all on function public.med_leave_kitchen(uuid) from public, anon;
grant execute on function public.med_is_member(uuid), public.med_apply_inventory(uuid, jsonb),
  public.med_create_kitchen(text, jsonb), public.med_join_kitchen(text), public.med_leave_kitchen(uuid) to authenticated;
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'med_inventory') then
    alter publication supabase_realtime add table public.med_inventory;
  end if;
end; $$;
commit;
