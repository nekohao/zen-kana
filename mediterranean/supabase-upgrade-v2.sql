-- Run AFTER supabase-setup.sql, in the dedicated Mediterranean Supabase project.
-- Existing single-family data is reused. Ambiguous installations stop without changes.
begin;
create table if not exists mediterranean_private.app_settings (
  singleton boolean primary key default true check (singleton),
  kitchen_id uuid not null references public.med_kitchens(id),
  admin_id uuid not null references auth.users(id)
);
create table if not exists mediterranean_private.devices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kitchen_id uuid not null references public.med_kitchens(id),
  enabled boolean not null default true,
  authorized_at timestamptz not null default now()
);
create table if not exists mediterranean_private.short_invites (
  kitchen_id uuid primary key references public.med_kitchens(id),
  code_hash text not null,
  expires_at timestamptz not null
);
alter table mediterranean_private.app_settings enable row level security;
alter table mediterranean_private.devices enable row level security;
alter table mediterranean_private.short_invites enable row level security;
revoke all on all tables in schema mediterranean_private from public, anon, authenticated;

do $$
declare
  -- Usually leave both NULL. If more than one old kitchen/account exists, explicitly
  -- set the existing kitchen UUID and/or administrator user UUID here before running.
  chosen_kitchen uuid := null;
  chosen_admin uuid := null;
  n integer;
begin
  if exists (select 1 from mediterranean_private.app_settings) then return; end if;
  if chosen_kitchen is null then
    select count(*) into n from public.med_kitchens;
    if n > 1 then raise exception 'Multiple kitchens: set chosen_kitchen to the existing inventory to keep'; end if;
    if n = 1 then select id into chosen_kitchen from public.med_kitchens; end if;
  end if;
  if chosen_kitchen is not null then
    if chosen_admin is null then select owner_id into chosen_admin from public.med_kitchens where id = chosen_kitchen; end if;
    if not exists (select 1 from public.med_kitchens where id = chosen_kitchen) then raise exception 'Selected kitchen does not exist'; end if;
  end if;
  if chosen_admin is null then
    select count(*) into n from auth.users where email is not null and not coalesce(is_anonymous, false);
    if n <> 1 then raise exception 'Set chosen_admin to the administrator UUID from Authentication > Users'; end if;
    select id into chosen_admin from auth.users where email is not null and not coalesce(is_anonymous, false);
  end if;
  if not exists (select 1 from auth.users where id = chosen_admin and email is not null and not coalesce(is_anonymous, false)) then
    raise exception 'Administrator must be an existing email account';
  end if;
  if chosen_kitchen is null then
    insert into public.med_kitchens(name, owner_id) values ('我们的厨房', chosen_admin) returning id into chosen_kitchen;
  end if;
  insert into mediterranean_private.app_settings(singleton, kitchen_id, admin_id) values (true, chosen_kitchen, chosen_admin);
  insert into public.med_kitchen_members(kitchen_id, user_id) values (chosen_kitchen, chosen_admin) on conflict do nothing;
  insert into mediterranean_private.devices(user_id, kitchen_id)
    select user_id, kitchen_id from public.med_kitchen_members where kitchen_id = chosen_kitchen on conflict do nothing;
end $$;

create or replace function public.med_is_member(p_kitchen uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from mediterranean_private.app_settings s where s.kitchen_id = p_kitchen
      and (s.admin_id = auth.uid() or exists (
        select 1 from public.med_kitchen_members m join mediterranean_private.devices d
          on d.user_id = m.user_id and d.kitchen_id = m.kitchen_id
        where m.kitchen_id = p_kitchen and m.user_id = auth.uid() and d.enabled
      ))
  );
$$;
create or replace function public.med_get_access()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s mediterranean_private.app_settings; kitchen_name text;
begin
  select * into s from mediterranean_private.app_settings where singleton;
  if not found then raise exception 'Not configured'; end if;
  if not public.med_is_member(s.kitchen_id) then raise exception 'Access required' using errcode = '42501'; end if;
  select name into kitchen_name from public.med_kitchens where id = s.kitchen_id;
  return jsonb_build_object('id', s.kitchen_id, 'name', kitchen_name, 'role', case when auth.uid() = s.admin_id then 'admin' else 'member' end);
end;
$$;
create or replace function public.med_issue_invite()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s mediterranean_private.app_settings; code text; deadline timestamptz;
begin
  select * into s from mediterranean_private.app_settings where singleton for update;
  if not found then raise exception 'Not configured'; end if;
  if auth.uid() is null or auth.uid() <> s.admin_id then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
  code := upper(encode(extensions.gen_random_bytes(8), 'hex'));
  deadline := clock_timestamp() + interval '10 minutes';
  insert into mediterranean_private.short_invites(kitchen_id, code_hash, expires_at)
    values (s.kitchen_id, encode(extensions.digest(code, 'sha256'), 'hex'), deadline)
    on conflict (kitchen_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at;
  return jsonb_build_object('code', code, 'expires_at', deadline, 'valid_for_seconds', 600);
end;
$$;
create or replace function public.med_join_kitchen(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare kitchen uuid; code text; invitation mediterranean_private.short_invites;
begin
  if auth.uid() is null then raise exception 'Access required' using errcode = '42501'; end if;
  code := upper(regexp_replace(p_code, '[[:space:]-]', '', 'g'));
  if code !~ '^[A-F0-9]{16}$' then raise exception 'Invalid invitation'; end if;
  select kitchen_id into kitchen from mediterranean_private.app_settings where singleton;
  select * into invitation from mediterranean_private.short_invites where kitchen_id = kitchen for update;
  if not found or invitation.expires_at <= clock_timestamp()
    or invitation.code_hash <> encode(extensions.digest(code, 'sha256'), 'hex') then
    raise exception 'Invalid invitation';
  end if;
  insert into public.med_kitchen_members(kitchen_id, user_id) values (kitchen, auth.uid()) on conflict do nothing;
  insert into mediterranean_private.devices(user_id, kitchen_id, enabled) values (auth.uid(), kitchen, true)
    on conflict (user_id) do update set kitchen_id = excluded.kitchen_id, enabled = true, authorized_at = now();
  return public.med_get_access();
end;
$$;

-- Preserve an immutable copy before normalizing the few genuinely synonymous names.
create table if not exists mediterranean_private.inventory_before_v2 as table public.med_inventory;
alter table mediterranean_private.inventory_before_v2 enable row level security;
revoke all on mediterranean_private.inventory_before_v2 from public, anon, authenticated;
create or replace function public.med_canonical_ingredient(p_name text)
returns text language sql immutable set search_path = '' as $$
  select case btrim(p_name)
    when '彩椒' then '甜椒' when '红彩椒' then '甜椒' when '红甜椒' then '甜椒'
    when '青甜椒' then '甜椒' when '黄甜椒' then '甜椒' when '黄彩椒' then '甜椒'
    when '绿甜椒' then '甜椒' when '绿彩椒' then '甜椒' when '西红柿' then '番茄'
    when '马铃薯' then '土豆' when '鲑鱼' then '三文鱼' when '大蒜' then '蒜'
    when '全麦吐司' then '全麦面包' when '五谷饭' then '熟杂粮饭' else btrim(p_name) end;
$$;
insert into public.med_inventory(kitchen_id, ingredient, available, priority, updated_at, updated_by)
  select distinct on (kitchen_id, public.med_canonical_ingredient(ingredient))
    kitchen_id, public.med_canonical_ingredient(ingredient), available, priority, updated_at, updated_by
  from public.med_inventory
  order by kitchen_id, public.med_canonical_ingredient(ingredient), updated_at desc,
    (ingredient = public.med_canonical_ingredient(ingredient)) desc
  on conflict (kitchen_id, ingredient) do update set available = excluded.available, priority = excluded.priority,
    updated_at = excluded.updated_at, updated_by = excluded.updated_by
  where public.med_inventory.updated_at <= excluded.updated_at;
delete from public.med_inventory where ingredient <> public.med_canonical_ingredient(ingredient);

create or replace function public.med_apply_inventory(p_kitchen uuid, p_changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare item jsonb; ingredient_name text; op uuid; is_available boolean; is_priority boolean;
begin
  if not public.med_is_member(p_kitchen) then raise exception 'Access required' using errcode = '42501'; end if;
  if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) > 500 then raise exception 'Invalid change list'; end if;
  for item in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(item->'name') is distinct from 'string' or jsonb_typeof(item->'available') is distinct from 'boolean'
      or jsonb_typeof(item->'priority') is distinct from 'boolean' then raise exception 'Invalid ingredient change'; end if;
    ingredient_name := public.med_canonical_ingredient(item->>'name');
    if char_length(ingredient_name) not between 1 and 80 then raise exception 'Invalid ingredient name'; end if;
    op := (item->>'operationId')::uuid;
    if op is null then raise exception 'Missing operation ID'; end if;
    is_available := (item->>'available')::boolean; is_priority := is_available and (item->>'priority')::boolean;
    insert into mediterranean_private.inventory_operations(kitchen_id, operation_id) values (p_kitchen, op) on conflict do nothing;
    if not found then continue; end if;
    insert into public.med_inventory(kitchen_id, ingredient, available, priority, updated_by)
      values (p_kitchen, ingredient_name, is_available, is_priority, auth.uid())
      on conflict (kitchen_id, ingredient) do update set available = excluded.available, priority = excluded.priority,
        updated_by = excluded.updated_by, updated_at = clock_timestamp();
  end loop;
end;
$$;
-- Retire old creation/leave RPCs, including the previous permanent invitation path.
revoke all on function public.med_create_kitchen(text, jsonb), public.med_leave_kitchen(uuid) from public, anon, authenticated;
revoke all on function public.med_get_access(), public.med_issue_invite(), public.med_join_kitchen(text),
  public.med_canonical_ingredient(text), public.med_apply_inventory(uuid, jsonb), public.med_is_member(uuid) from public, anon, authenticated;
grant execute on function public.med_get_access(), public.med_issue_invite(), public.med_join_kitchen(text),
  public.med_apply_inventory(uuid, jsonb), public.med_is_member(uuid) to authenticated;
commit;
