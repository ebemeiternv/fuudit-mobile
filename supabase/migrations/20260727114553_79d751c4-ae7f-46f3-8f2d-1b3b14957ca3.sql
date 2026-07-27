ALTER TABLE public.grocery_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS meal_plan_entry_id uuid REFERENCES public.meal_plan_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS grocery_items_user_checked_idx
  ON public.grocery_items (user_id, checked, created_at);

CREATE INDEX IF NOT EXISTS grocery_items_meal_plan_entry_idx
  ON public.grocery_items (meal_plan_entry_id);

DROP TRIGGER IF EXISTS grocery_items_set_updated_at ON public.grocery_items;
CREATE TRIGGER grocery_items_set_updated_at
BEFORE UPDATE ON public.grocery_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();