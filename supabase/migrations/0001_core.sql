-- Meu Controle: núcleo. SEGURO PARA RODAR MAIS DE UMA VEZ (só cria o que falta). Dinheiro em CENTAVOS (bigint). RLS em tudo.
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null, is_admin boolean not null default false,
  created_at timestamptz not null default now());

create table if not exists categories (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
  name text not null, kind text not null check (kind in ('income','expense')));

create table if not exists accounts (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
  name text not null, type text not null, initial_balance_cents bigint not null default 0);

create table if not exists cards (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
  name text not null, limit_cents bigint not null, closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31), pay_account_id uuid references accounts);

create table if not exists invoices (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
  card_id uuid not null references cards on delete cascade, reference_month date not null,
  status text not null default 'open' check (status in ('open','closed','paid')), unique (card_id, reference_month));

create table if not exists goals (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
  name text not null, target_cents bigint not null, deadline date, monthly_plan_cents bigint);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
  kind text not null check (kind in ('income','expense','transfer_in','transfer_out','invoice_payment','goal_deposit','goal_withdraw')),
  amount_cents bigint not null check (amount_cents > 0), occurred_on date not null, description text not null,
  category_id uuid references categories, account_id uuid references accounts, card_id uuid references cards,
  invoice_id uuid references invoices, goal_id uuid references goals,
  transfer_group_id uuid, installment_group_id uuid, installment_no int, installments_total int,
  import_hash text, notes text, created_at timestamptz not null default now(),
  -- compra no cartão não tem conta; demais precisam de conta
  check ((card_id is not null and account_id is null and kind = 'expense') or (card_id is null and account_id is not null)),
  unique (user_id, import_hash));   -- evita duplicar importação

-- Cobrança / assinatura SaaS
create table if not exists subscriptions (user_id uuid primary key references profiles on delete cascade,
  plan text check (plan in ('basic','max')), period_start timestamptz, period_end timestamptz,
  admin_override_until timestamptz);

create table if not exists charges (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles,
  plan text not null check (plan in ('basic','max')), amount_cents bigint not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','refunded','expired')),
  provider text not null default 'mercadopago', provider_payment_id text unique,
  pix_qr text, pix_copy_paste text, expires_at timestamptz, paid_at timestamptz,
  period_start timestamptz, period_end timestamptz, created_at timestamptz not null default now());

create table if not exists webhook_events (provider_event_id text primary key, payload jsonb not null,
  processed_at timestamptz, received_at timestamptz not null default now());  -- idempotência

create table if not exists notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles,
  type text not null, ref text not null, channel text not null, sent_at timestamptz not null default now(),
  unique (user_id, type, ref, channel));   -- nunca enviar o mesmo aviso 2x

create table if not exists admin_audit (id uuid primary key default gen_random_uuid(), admin_id uuid not null references profiles,
  target_user uuid, action text not null, details jsonb, created_at timestamptz not null default now());

-- RLS: cada usuário só vê o que é dele
do $$ declare t text; begin
  foreach t in array array['categories','accounts','cards','invoices','goals','transactions'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='own_all') then
      execute format('create policy own_all on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    end if;
  end loop;
  -- cliente só LÊ assinatura/cobranças/avisos; escrita só pelo servidor (service role)
  foreach t in array array['subscriptions','charges','notifications'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='own_read') then
      execute format('create policy own_read on %I for select using (user_id = auth.uid())', t);
    end if;
  end loop;
  alter table profiles enable row level security;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='own_profile') then
    create policy own_profile on profiles for select using (id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='own_profile_upd') then
    create policy own_profile_upd on profiles for update using (id = auth.uid()) with check (id = auth.uid() and is_admin = false); end if;
end $$;
alter table webhook_events enable row level security;  -- sem policies = só service role
alter table admin_audit enable row level security;

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name','')) on conflict (id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
-- perfis para usuários que já existiam antes do gatilho
insert into profiles (id, name) select id, coalesce(raw_user_meta_data->>'name','') from auth.users on conflict (id) do nothing;
