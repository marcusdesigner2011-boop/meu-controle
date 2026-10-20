# Meu Controle — Instruções (Etapas 1 a 3)

> Este código se conecta a um projeto Supabase existente, com dados e migrações aplicadas. Não rode scripts SQL deste documento no banco de produção. Antes de qualquer migração, compare o histórico e o esquema do projeto e faça uma revisão específica.

## 0. Se você viu o erro `42P07: relation "profiles" already exists`
Significa que o `0001_core.sql` já tinha sido executado (total ou em parte). Não é grave e **nada foi perdido**.
O `0001_core.sql` deste ZIP agora só cria o que falta e nunca apaga tabelas ou dados. Faça nesta ordem:
1. Supabase > **SQL Editor > New query**. Cole `supabase/diagnostico.sql` e clique **Run** (só lê, não altera). Veja se aparecem as 12 tabelas e se `rls_ligado` é `true` em todas. Se algo parecer estranho, me envie o resultado antes de continuar.
2. Nova query: cole o `supabase/migrations/0001_core.sql` atualizado e **Run**. Pode rodar quantas vezes quiser.
3. Nova query: cole o `supabase/migrations/0003_etapa3.sql` e **Run**. Ele troca UMA regra de segurança (policy) da tabela `transactions` (impede lançar na conta de outro usuário), cria as categorias padrão e preenche as de usuários já cadastrados. Nenhuma linha é apagada.
4. Em **Table Editor**, confirme as 12 tabelas, que `categories` tem linhas e que `profiles` tem o seu usuário.

---
# Configuração do zero (se ainda não fez)

## A. Criar o projeto no Supabase (grátis)
1. Acesse https://supabase.com e clique em **Start your project**. Entre com GitHub ou e-mail.
2. Clique em **New project**. Escolha um nome (ex.: meu-controle), crie uma **senha do banco** (guarde-a num lugar seguro) e em **Region** escolha **South America (São Paulo)**. Clique em **Create new project** e espere 1–2 minutos.
3. No menu da esquerda, abra **Project Settings > API** (ou **API Keys**). Copie:
   - **Project URL** (algo como https://abcd1234.supabase.co)
   - a chave **anon / public** (em painéis novos pode se chamar **Publishable key**). Ela pode ir no navegador.
   NÃO use a chave **service_role** agora: ela é secreta e só será usada no servidor nas etapas de pagamento.
4. No menu, abra **SQL Editor > New query**, cole todo o conteúdo de `supabase/migrations/0001_core.sql` e clique em **Run**. Deve aparecer "Success". Confira em **Table Editor** se as tabelas foram criadas.
5. Abra **Authentication > URL Configuration** e preencha:
   - **Site URL:** http://localhost:3000
   - **Redirect URLs:** http://localhost:3000/auth/callback
6. Abra **Authentication > Sign In / Providers > Email**. Para testar rápido, você pode desligar **Confirm email**. Em produção, deixe LIGADO. Atenção: o envio de e-mails padrão do Supabase é limitado a poucos por hora; para produção configure um SMTP próprio (ex.: Resend).

## B. Configurar o projeto
```
cp .env.example .env.local
```
Preencha em `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com o que copiou. Deixe o resto vazio por enquanto.

## C. Executar e testar
```
npm install
npm test        # testes das regras financeiras e de cobrança
npm run dev     # http://localhost:3000
```
Checklist:
1. Abra /painel sem estar logado → deve ir para /entrar.
2. Crie uma conta em /cadastrar → vai para /painel (ou pede confirmação por e-mail, se ligada).
3. No Supabase > Table Editor > profiles, a linha do seu usuário deve existir (criada pelo gatilho).
4. Clique em Sair, depois entre de novo. Teste também "Esqueci minha senha".
5. Logado, abra /entrar → deve voltar para /painel.

## Etapa 3: o que testar
1. Em **Contas**, crie uma conta com saldo inicial (ex.: 1.000,00).
2. Em **Lançamentos**, adicione uma receita e uma despesa. O saldo em Contas e no Painel muda na hora.
3. Navegue pelos meses (← →) e filtre por tipo e categoria. Edite e exclua um lançamento.
4. Tente excluir uma conta ou categoria com lançamentos: o sistema recusa e explica (nada é apagado).
5. Crie um segundo usuário (janela anônima) e confirme que ele não vê nada do primeiro.
