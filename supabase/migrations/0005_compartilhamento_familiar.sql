-- Compartilhamento familiar somente leitura para finanças explicitamente habilitadas.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  share_finances boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists family_members_user_idx on public.family_members(user_id, group_id);

alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
drop policy if exists owner_all on public.family_groups;
create policy owner_all on public.family_groups for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create or replace function private.is_family_owner(p_group_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.family_groups g
    where g.id = p_group_id and g.owner_id = auth.uid()
  );
$$;

create or replace function private.is_family_member(p_group_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.family_members m
    where m.group_id = p_group_id and m.user_id = auth.uid()
  );
$$;

create or replace function private.can_view_shared_finances(p_owner_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.family_groups g
    join public.family_members m on m.group_id = g.id
    where g.owner_id = p_owner_id
      and g.share_finances
      and m.user_id = auth.uid()
      and m.user_id <> p_owner_id
  );
$$;

revoke all on function private.is_family_owner(uuid) from public, anon;
revoke all on function private.is_family_member(uuid) from public, anon;
revoke all on function private.can_view_shared_finances(uuid) from public, anon;
grant execute on function private.is_family_owner(uuid) to authenticated;
grant execute on function private.is_family_member(uuid) to authenticated;
grant execute on function private.can_view_shared_finances(uuid) to authenticated;

drop policy if exists member_read on public.family_groups;
create policy member_read on public.family_groups for select to authenticated
  using ((select private.is_family_member(id)));

drop policy if exists member_read on public.family_members;
create policy member_read on public.family_members for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_family_owner(group_id)));
drop policy if exists owner_self_insert on public.family_members;
create policy owner_self_insert on public.family_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'owner' and (select private.is_family_owner(group_id)));
drop policy if exists member_or_owner_delete on public.family_members;
create policy member_or_owner_delete on public.family_members for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_family_owner(group_id)));
grant select, insert, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.family_groups to authenticated;

create or replace function public.family_add_member(p_group_id uuid, p_email text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare target_user uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.family_groups g where g.id = p_group_id and g.owner_id = auth.uid()
  ) then
    raise exception 'not allowed';
  end if;
  select u.id into target_user from auth.users u
  where lower(u.email) = lower(trim(p_email)) and u.id <> auth.uid()
  limit 1;
  if target_user is not null then
    insert into public.family_members(group_id, user_id, role)
    values (p_group_id, target_user, 'member')
    on conflict (group_id, user_id) do nothing;
  end if;
end;
$$;

create or replace function public.family_remove_member(p_group_id uuid, p_email text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.family_groups g where g.id = p_group_id and g.owner_id = auth.uid()
  ) then
    raise exception 'not allowed';
  end if;
  delete from public.family_members m
  using auth.users u
  where m.group_id = p_group_id
    and m.user_id = u.id
    and u.id <> auth.uid()
    and lower(u.email) = lower(trim(p_email));
end;
$$;
revoke all on function public.family_add_member(uuid, text) from public, anon;
revoke all on function public.family_remove_member(uuid, text) from public, anon;
grant execute on function public.family_add_member(uuid, text) to authenticated;
grant execute on function public.family_remove_member(uuid, text) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['accounts','categories','transactions','goals','budgets','recurring_rules'] loop
    execute format('drop policy if exists family_read on public.%I', t);
    execute format(
      'create policy family_read on public.%I for select to authenticated using ((select private.can_view_shared_finances(user_id)))',
      t
    );
  end loop;
end $$;
