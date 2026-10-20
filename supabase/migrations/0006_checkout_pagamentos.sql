-- Checkout Pix do Meu Controle. A migration é aditiva e não altera dados existentes.
-- A data de corte preserva o acesso das contas já cadastradas.

create table if not exists public.billing_settings (
  singleton boolean primary key default true check (singleton),
  checkout_cutover_at timestamptz not null default now()
);
alter table public.billing_settings enable row level security;
create policy billing_cutover_read on public.billing_settings
  for select to authenticated using (true);
grant select on public.billing_settings to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.billing_settings from anon, authenticated;
insert into public.billing_settings(singleton, checkout_cutover_at)
values (true, now()) on conflict (singleton) do nothing;
grant select on public.billing_settings to service_role;

-- A chave de backend é usada somente pelo servidor da aplicação e pelo webhook.
grant select, insert, update on public.charges to service_role;
grant select, insert, update on public.subscriptions to service_role;

-- A aprovação só é gravada depois da consulta autenticada ao Mercado Pago.
-- O trigger mantém assinatura e cobrança na mesma transação e evita extensões duplicadas.
create or replace function private.sync_subscription_from_charge()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_end timestamptz;
  start_at timestamptz;
  end_at timestamptz;
  prior_plan text;
  prior_start timestamptz;
  prior_end timestamptz;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if new.paid_at is null then
      raise exception 'approved charge requires paid_at';
    end if;

    select s.period_end into current_end
    from public.subscriptions s
    where s.user_id = new.user_id
    for update;

    start_at := case when current_end is not null and current_end > new.paid_at
      then current_end else new.paid_at end;
    end_at := start_at + interval '1 month';

    update public.charges
    set period_start = start_at, period_end = end_at
    where id = new.id;

    insert into public.subscriptions(user_id, plan, period_start, period_end)
    values (new.user_id, new.plan, start_at, end_at)
    on conflict (user_id) do update
      set plan = excluded.plan,
          period_start = excluded.period_start,
          period_end = excluded.period_end;
  elsif old.status = 'approved' and new.status = 'refunded' then
    select c.plan, c.period_start, c.period_end
      into prior_plan, prior_start, prior_end
    from public.charges c
    where c.user_id = new.user_id
      and c.status = 'approved'
      and c.id <> new.id
      and c.period_end > now()
    order by c.period_end desc
    limit 1;

    update public.subscriptions
    set plan = prior_plan,
        period_start = prior_start,
        period_end = prior_end
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_subscription_from_charge() from public, anon, authenticated;

create trigger charges_sync_subscription
after update of status on public.charges
for each row
when (old.status is distinct from new.status)
execute function private.sync_subscription_from_charge();
