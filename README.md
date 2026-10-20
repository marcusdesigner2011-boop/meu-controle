# Meu Controle

Aplicativo financeiro pessoal e familiar com planos mensais e pagamento por Pix com revisão manual.

## Pagamento manual

- O cliente solicita um plano e recebe a chave Pix configurada pelo administrador.
- O cliente faz o Pix no aplicativo do banco e o pagamento fica pendente.
- O administrador confere o crédito no extrato bancário antes de aprovar.
- A aprovação grava a cobrança e atualiza a assinatura na mesma transação do banco.
- Enviar um comprovante ou marcar que pagou não libera acesso. Somente a aprovação do administrador ativa o plano.

No site, acesse **Mais ferramentas → Painel administrativo**. O proprietário do projeto já está marcado como administrador no Supabase. No painel, cadastre a chave Pix e o nome do titular, depois acompanhe clientes, cobranças e planos ativos.

## Banco de dados

`supabase/migrations/0001_core.sql` contém o núcleo do app. `0004_planejamento.sql`, `0005_compartilhamento_familiar.sql` e `0006_checkout_pagamentos.sql` ampliam as funcionalidades. `0007_aprovacao_manual_pix.sql` adiciona o pagamento manual, dados mínimos de contato ao perfil e políticas administrativas. A migration `0007` é aditiva e mantém os dados existentes.

## Ambiente

Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL` no ambiente da aplicação. A chave Pix e o titular são configurados pelo painel administrativo. Não é necessário token do Mercado Pago para o fluxo manual.

Nunca coloque credenciais secretas em variáveis com prefixo `NEXT_PUBLIC_`, no navegador ou no GitHub.
