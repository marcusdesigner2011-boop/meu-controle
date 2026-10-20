-- Planejamento: orçamentos e lançamentos recorrentes.
-- A migration é aditiva: não altera nem remove linhas existentes.

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  period_month date not null check (extract(day from period_month) = 1),
  limit_cents bigint not null check (limit_cents > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, period_month)
);
create index if not exists budgets_user_month_idx on public.budgets(user_id, period_month desc);
alter table public.budgets enable row level security;
drop policy if exists own_all on public.budgets;
create policy own_all on public.budgets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.budgets to authenticated;

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 120),
  kind text not null check (kind in ('income','expense')),
  amount_cents bigint not null check (amount_cents > 0),
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  payment_method text,
  cadence text not null check (cadence in ('weekly','monthly','yearly')),
  next_due_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists recurring_rules_user_due_idx on public.recurring_rules(user_id, is_active, next_due_on);
alter table public.recurring_rules enable row level security;
drop policy if exists own_all on public.recurring_rules;
create policy own_all on public.recurring_rules for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.recurring_rules to authenticated;

create or replace function public.generate_next_recurring(p_rule_id uuid)
returns void language plpgsql
set search_path = pg_catalog, public, auth
as $$
declare
  r public.recurring_rules%rowtype;
  next_date date;
  target_month date;
  month_end date;
  item_hash text;
begin
  select * into r from public.recurring_rules
  where id = p_rule_id and user_id = auth.uid() and is_active
  for update;
  if not found then raise exception 'recurring rule unavailable'; end if;

  item_hash := 'recurring:' || r.id::text || ':' || r.next_due_on::text;
  insert into public.transactions
    (user_id, kind, amount_cents, occurred_on, description, account_id, category_id, payment_method, import_hash)
  values
    (r.user_id, r.kind, r.amount_cents, r.next_due_on, r.description, r.account_id, r.category_id, r.payment_method, item_hash)
  on conflict (user_id, import_hash) do nothing;

  if r.cadence = 'weekly' then
    next_date := r.next_due_on + 7;
  elsif r.cadence = 'monthly' then
    target_month := date_trunc('month', r.next_due_on::timestamp + interval '1 month')::date;
    month_end := (target_month + interval '1 month' - interval '1 day')::date;
    next_date := target_month + least(extract(day from r.next_due_on)::integer, extract(day from month_end)::integer) - 1;
  else
    target_month := make_date(extract(year from r.next_due_on)::integer + 1, extract(month from r.next_due_on)::integer, 1);
    month_end := (target_month + interval '1 month' - interval '1 day')::date;
    next_date := target_month + least(extract(day from r.next_due_on)::integer, extract(day from month_end)::integer) - 1;
  end if;
  update public.recurring_rules set next_due_on = next_date where id = r.id and user_id = auth.uid();
end;
$$;
revoke all on function public.generate_next_recurring(uuid) from public, anon;
grant execute on function public.generate_next_recurring(uuid) to authenticated;
