# Configuração do Meu Controle

## Banco Supabase existente

Este projeto usa o banco Supabase existente do Meu Controle. O histórico foi conferido antes da publicação. As migrações de planejamento, compartilhamento familiar, checkout e aprovação manual foram aplicadas sem apagar os dados existentes. Não rode as migrações antigas novamente em produção.

`supabase/migrations/0007_aprovacao_manual_pix.sql` documenta as alterações adicionadas para o painel e o Pix manual. Ela acrescenta colunas e regras de acesso; mantém as tabelas e registros atuais.

## Variáveis do aplicativo

Configure no ambiente do Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (em produção, o endereço HTTPS do site)

As duas chaves públicas do Supabase e o endereço de produção já estão no Vercel. Não inclua `service_role`, senhas, tokens ou chaves privadas no navegador, no GitHub ou neste arquivo.

## Chave Pix e conferência

Entre no site com a conta administradora e abra **Mais ferramentas → Painel administrativo**. Cadastre a chave Pix recebedora e o nome que aparece para o pagador. O cliente pagará no aplicativo do banco; confira o recebimento no extrato antes de aprovar a cobrança. A aprovação atualiza a assinatura e libera o acesso.

## Autenticação

No Supabase, em **Authentication → URL Configuration**, mantenha o endereço público do site como Site URL e permita o retorno para `/auth/callback`. O endereço local `http://localhost:3000/auth/callback` pode ser adicionado para desenvolvimento.

