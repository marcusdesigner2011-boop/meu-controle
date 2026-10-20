# Meu Controle (veja SETUP.md)

## O que já existe
- `supabase/migrations/0001_core.sql`: tabelas, RLS por usuário, idempotência de webhook/notificações.
- `src/lib/finance`: dinheiro em centavos, saldo, parcelas sem perda de centavo.
- `src/lib/billing/plans.ts`: preços no servidor, regra de datas, status, regra de liberação.
- Cadastro com escolha de plano, checkout Pix Mercado Pago e confirmação segura por webhook.
- `tests/finance.test.ts`: `npm install && npm test`.

## Configurar pagamentos

O checkout Pix e o processamento automático de confirmação estão implementados. Para habilitar cobranças reais, configure no ambiente **do servidor** as variáveis já listadas em `.env.example`: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY`, além de `NEXT_PUBLIC_SITE_URL` apontando para o endereço público HTTPS do app. Nunca use prefixo `NEXT_PUBLIC_` nas credenciais secretas.

No painel do Mercado Pago, configure o webhook de pagamentos para:

`https://SEU-DOMINIO/api/webhooks/mercadopago`

Ative o evento de pagamento e use a chave secreta de assinatura do webhook em `MP_WEBHOOK_SECRET`. A aprovação só é aceita após validar a assinatura e consultar o pagamento diretamente no Mercado Pago. O ambiente `localhost` não recebe webhooks públicos e o checkout real é bloqueado nele.

No Supabase, mantenha o callback de autenticação autorizado para `https://SEU-DOMINIO/auth/callback`; para desenvolvimento local, `http://localhost:3000/**` permite o retorno de confirmação com o plano selecionado. A data de corte da migration preserva o acesso dos perfis que já existiam antes da cobrança ser habilitada.

O projeto não contém credenciais de produção do Mercado Pago e não foi feita cobrança real.

## Sobre a chave Pix (importante)
Uma chave Pix comum **não** permite gerar cobranças nem consultar pagamentos por API.
Com o Mercado Pago, as cobranças são geradas **na conta Mercado Pago** (token `MP_ACCESS_TOKEN`) e o dinheiro cai
nessa conta, e não numa chave Pix externa. Para receber no seu banco, você saca/transfere do Mercado Pago.
Confirme no app do Mercado Pago se a conta está no nome de quem deve receber. Nunca coloque o token no frontend.
