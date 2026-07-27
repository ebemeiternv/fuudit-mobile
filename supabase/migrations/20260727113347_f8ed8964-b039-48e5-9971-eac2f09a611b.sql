ALTER TABLE public.meal_plan_entries
  ADD COLUMN IF NOT EXISTS custom_title text;

ALTER TABLE public.meal_plan_entries
  DROP CONSTRAINT IF EXISTS meal_plan_entries_has_content;

ALTER TABLE public.meal_plan_entries
  ADD CONSTRAINT meal_plan_entries_has_content
  CHECK (recipe_id IS NOT NULL OR (custom_title IS NOT NULL AND length(btrim(custom_title)) > 0));

DROP TRIGGER IF EXISTS meal_plan_entries_set_updated_at ON public.meal_plan_entries;
CREATE TRIGGER meal_plan_entries_set_updated_at
BEFORE UPDATE ON public.meal_plan_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS meal_plan_entries_user_date_idx
  ON public.meal_plan_entries (user_id, date);