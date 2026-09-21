ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS price_paid numeric,
  ADD COLUMN IF NOT EXISTS price_currency text;

ALTER TABLE public.pantry_items
  ADD CONSTRAINT pantry_items_price_paid_non_negative CHECK (price_paid IS NULL OR price_paid >= 0);

ALTER TABLE public.pantry_items
  ADD CONSTRAINT pantry_items_price_currency_iso CHECK (price_currency IS NULL OR price_currency ~ '^[A-Z]{3}$');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS planning_defaults jsonb NOT NULL DEFAULT '{}'::jsonb;