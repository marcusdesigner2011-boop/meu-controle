-- Adds the receiving city required by a static Pix BR Code QR payload.
-- Additive and nullable so existing billing settings and customer data remain intact.
alter table public.billing_settings
  add column if not exists pix_city text;
