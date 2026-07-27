
CREATE TYPE public.pantry_event_type AS ENUM ('added','consumed','discarded','deleted');

CREATE TABLE public.pantry_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pantry_item_id uuid NULL,
  event_type public.pantry_event_type NOT NULL,
  item_name text NOT NULL,
  category text NULL,
  quantity numeric NULL,
  unit public.unit_type NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pantry_events_user_occurred_idx ON public.pantry_events (user_id, occurred_at DESC);
CREATE INDEX pantry_events_user_type_idx ON public.pantry_events (user_id, event_type);

GRANT SELECT, INSERT ON public.pantry_events TO authenticated;
GRANT ALL ON public.pantry_events TO service_role;

ALTER TABLE public.pantry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pantry_events select own"
  ON public.pantry_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pantry_events insert own"
  ON public.pantry_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
