-- Aprovação manual de Pix e painel administrativo.
-- Mudanças aditivas: preserva cobranças, assinaturas e demais dados existentes.

alter table public.billing_settings
  add column if not exists pix_key text,
  add column if not exists pix_holder_name text;

-- Todo perfil precisa de uma assinatura aprovada para acessar as áreas pagas.
-- A alteração afeta apenas a data de corte; cobranças e dados financeiros ficam intactos.
update public.billing_settings
set checkout_cutover_at = '1970-01-01T00:00:00Z'
where singleton = true;

alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_profile_email() from public, anon, authenticated;
drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_admin = true
  );
$$;
revoke all on function private.current_user_is_admin() from public, anon;
grant execute on function private.current_user_is_admin() to authenticated;

drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles
  for select to authenticated using ((select private.current_user_is_admin()));

-- Clientes podem abrir cobranças manuais pendentes próprias; só admin pode revisar.
grant select, insert, update on public.charges to authenticated;
drop policy if exists charges_owner_insert_manual on public.charges;
create policy charges_owner_insert_manual on public.charges
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and provider = 'manual_pix'
    and paid_at is null
    and provider_payment_id is null
  );
drop policy if exists charges_admin_read on public.charges;
create policy charges_admin_read on public.charges
  for select to authenticated using ((select private.current_user_is_admin()));
drop policy if exists charges_admin_update on public.charges;
create policy charges_admin_update on public.charges
  for update to authenticated
  using ((select private.current_user_is_admin()))
  with check ((select private.current_user_is_admin()));

grant select on public.subscriptions to authenticated;
drop policy if exists subscriptions_admin_read on public.subscriptions;
create policy subscriptions_admin_read on public.subscriptions
  for select to authenticated using ((select private.current_user_is_admin()));

grant update on public.billing_settings to authenticated;
drop policy if exists billing_admin_update on public.billing_settings;
create policy billing_admin_update on public.billing_settings
  for update to authenticated
  using ((select private.current_user_is_admin()))
  with check ((select private.current_user_is_admin()));

grant select, insert on public.admin_audit to authenticated;
drop policy if exists admin_audit_admin_read on public.admin_audit;
create policy admin_audit_admin_read on public.admin_audit
  for select to authenticated using ((select private.current_user_is_admin()));
drop policy if exists admin_audit_admin_insert on public.admin_audit;
create policy admin_audit_admin_insert on public.admin_audit
  for insert to authenticated
  with check (admin_id = (select auth.uid()) and (select private.current_user_is_admin()));

-- Perfis só podem alterar o próprio nome. E-mail vem exclusivamente de auth.users.
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;
