DO $$ BEGIN
  CREATE TYPE public.pantry_item_status AS ENUM ('active','consumed','discarded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS purchased_on date,
  ADD COLUMN IF NOT EXISTS status public.pantry_item_status NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS pantry_items_user_status_idx
  ON public.pantry_items (user_id, status);

CREATE INDEX IF NOT EXISTS pantry_items_user_expires_idx
  ON public.pantry_items (user_id, expires_on);