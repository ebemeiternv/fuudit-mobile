CREATE TABLE public.product_intelligence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_key text NOT NULL,
  barcode text,
  display_name text NOT NULL,
  preferred_category text,
  preferred_location public.pantry_location,
  preferred_quantity numeric,
  preferred_unit public.unit_type,
  preferred_package_quantity numeric,
  preferred_package_unit public.unit_type,
  preferred_expiry_offset_days integer,
  purchase_count integer NOT NULL DEFAULT 0,
  consumption_count integer NOT NULL DEFAULT 0,
  discard_count integer NOT NULL DEFAULT 0,
  avg_consumption_days numeric,
  avg_discard_days numeric,
  avg_purchase_interval_days numeric,
  last_purchased_at timestamptz,
  last_consumed_at timestamptz,
  last_discarded_at timestamptz,
  observations integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, identity_key)
);

CREATE INDEX product_intelligence_user_recent_idx
  ON public.product_intelligence (user_id, last_purchased_at DESC NULLS LAST);
CREATE INDEX product_intelligence_user_frequency_idx
  ON public.product_intelligence (user_id, purchase_count DESC);
CREATE INDEX product_intelligence_barcode_idx
  ON public.product_intelligence (user_id, barcode) WHERE barcode IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_intelligence TO authenticated;
GRANT ALL ON public.product_intelligence TO service_role;

ALTER TABLE public.product_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_intelligence owner all"
  ON public.product_intelligence
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER product_intelligence_set_updated_at
  BEFORE UPDATE ON public.product_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();