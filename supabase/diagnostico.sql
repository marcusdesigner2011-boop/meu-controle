-- SOMENTE LEITURA: não altera nada. Rode e veja o que já existe.
select table_name from information_schema.tables where table_schema='public' order by 1;           -- esperado: 12 tabelas
select tablename, rowsecurity as rls_ligado from pg_tables where schemaname='public' order by 1;     -- tudo deve ser true
select tablename, policyname from pg_policies where schemaname='public' order by 1, 2;
select (select count(*) from auth.users) as usuarios, (select count(*) from public.profiles) as perfis;
