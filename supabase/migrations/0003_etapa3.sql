-- Etapa 3. Seguro para rodar mais de uma vez. Não apaga dados.
alter table transactions add column if not exists payment_method text;
create index if not exists transactions_user_date_idx on transactions (user_id, occurred_on desc);
create index if not exists transactions_account_idx on transactions (account_id);

-- SEGURANÇA: impede lançar em conta/categoria/cartão de OUTRO usuário (a FK sozinha não impede).
-- Troca apenas a regra de acesso (policy) de transactions; nenhuma linha é tocada.
drop policy if exists own_all on transactions;
create policy own_all on transactions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and (account_id  is null or exists (select 1 from accounts   a where a.id = transactions.account_id  and a.user_id = auth.uid()))
    and (card_id     is null or exists (select 1 from cards      c where c.id = transactions.card_id     and c.user_id = auth.uid()))
    and (category_id is null or exists (select 1 from categories k where k.id = transactions.category_id and k.user_id = auth.uid()))
    and (goal_id     is null or exists (select 1 from goals      g where g.id = transactions.goal_id     and g.user_id = auth.uid()))
    and (invoice_id  is null or exists (select 1 from invoices   i where i.id = transactions.invoice_id  and i.user_id = auth.uid())));

-- Categorias padrão para cada usuário (só cria se o usuário ainda não tem nenhuma)
create or replace function seed_default_categories(uid uuid) returns void language sql security definer set search_path = public as $$
  insert into categories (user_id, name, kind)
  select uid, v.n, v.k from (values
    ('Alimentação','expense'),('Moradia','expense'),('Transporte','expense'),('Saúde','expense'),
    ('Educação','expense'),('Lazer','expense'),('Outros','expense'),
    ('Salário','income'),('Freelance','income'),('Outros','income')) as v(n,k)
  where not exists (select 1 from categories where user_id = uid);
$$;
revoke execute on function seed_default_categories(uuid) from public, anon, authenticated;

create or replace function profiles_seed() returns trigger language plpgsql security definer set search_path = public as $$
begin perform seed_default_categories(new.id); return new; end $$;
revoke execute on function profiles_seed() from public, anon, authenticated;
drop trigger if exists profiles_seed_trg on profiles;
create trigger profiles_seed_trg after insert on profiles for each row execute function profiles_seed();

select seed_default_categories(id) from profiles;  -- usuários que já existem
