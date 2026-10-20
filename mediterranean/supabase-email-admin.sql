-- Existing v2 installations: run this once in the Mediterranean SQL Editor.
-- Keeps the same kitchen, inventory, device authorizations and active invitation.
begin;
create or replace function public.med_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u where u.id = auth.uid()
      and u.is_anonymous = false and nullif(btrim(u.email), '') is not null
      and u.email_confirmed_at is not null
  );
$$;
create or replace function public.med_is_member(p_kitchen uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from mediterranean_private.app_settings s where s.kitchen_id = p_kitchen
      and (public.med_is_admin() or exists (
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
  return jsonb_build_object('id', s.kitchen_id, 'name', kitchen_name, 'role', case when public.med_is_admin() then 'admin' else 'member' end);
end;
$$;
create or replace function public.med_issue_invite()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s mediterranean_private.app_settings; code text; deadline timestamptz;
begin
  select * into s from mediterranean_private.app_settings where singleton for update;
  if not found then raise exception 'Not configured'; end if;
  if not public.med_is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
  code := upper(encode(extensions.gen_random_bytes(8), 'hex'));
  deadline := clock_timestamp() + interval '10 minutes';
  insert into mediterranean_private.short_invites(kitchen_id, code_hash, expires_at)
    values (s.kitchen_id, encode(extensions.digest(code, 'sha256'), 'hex'), deadline)
    on conflict (kitchen_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at;
  return jsonb_build_object('code', code, 'expires_at', deadline, 'valid_for_seconds', 600);
end;
$$;
revoke all on function public.med_is_admin(), public.med_is_member(uuid), public.med_get_access(), public.med_issue_invite() from public, anon, authenticated;
grant execute on function public.med_is_admin(), public.med_is_member(uuid), public.med_get_access(), public.med_issue_invite() to authenticated;
commit;
