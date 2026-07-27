
ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS product_image_url text,
  ADD COLUMN IF NOT EXISTS product_source text,
  ADD COLUMN IF NOT EXISTS product_source_id text,
  ADD COLUMN IF NOT EXISTS package_quantity numeric,
  ADD COLUMN IF NOT EXISTS package_unit unit_type;

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_barcode
  ON public.pantry_items(user_id, barcode)
  WHERE barcode IS NOT NULL AND status = 'active';
