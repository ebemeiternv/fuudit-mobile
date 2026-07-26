
-- ============ ENUMS ============
CREATE TYPE public.unit_type AS ENUM ('g','kg','ml','l','piece','tbsp','tsp','cup');
CREATE TYPE public.pantry_location AS ENUM ('fridge','freezer','pantry','other');
CREATE TYPE public.meal_type AS ENUM ('breakfast','lunch','dinner','snack');
CREATE TYPE public.chef_message_role AS ENUM ('user','assistant','system');

-- ============ PANTRY ITEMS ============
CREATE TABLE public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit public.unit_type,
  location public.pantry_location NOT NULL DEFAULT 'pantry',
  expires_on DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO authenticated;
GRANT ALL ON public.pantry_items TO service_role;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pantry_items owner all" ON public.pantry_items
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX pantry_items_user_expires_idx ON public.pantry_items(user_id, expires_on);

-- ============ RECIPES (shared cache) ============
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'spoonacular',
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  image TEXT,
  servings INTEGER,
  ready_minutes INTEGER,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
GRANT SELECT ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes read all authenticated" ON public.recipes
  FOR SELECT TO authenticated USING (true);

-- ============ SAVED RECIPES ============
CREATE TABLE public.saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_recipes TO authenticated;
GRANT ALL ON public.saved_recipes TO service_role;
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_recipes owner all" ON public.saved_recipes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ MEAL PLAN ENTRIES ============
CREATE TABLE public.meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type public.meal_type NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  servings INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_entries TO authenticated;
GRANT ALL ON public.meal_plan_entries TO service_role;
ALTER TABLE public.meal_plan_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plan owner all" ON public.meal_plan_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX meal_plan_user_date_idx ON public.meal_plan_entries(user_id, date);

-- ============ GROCERY ITEMS ============
CREATE TABLE public.grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit public.unit_type,
  checked BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual',
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_items TO authenticated;
GRANT ALL ON public.grocery_items TO service_role;
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grocery_items owner all" ON public.grocery_items
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX grocery_items_user_idx ON public.grocery_items(user_id, checked);

-- ============ CHEF CONVERSATIONS ============
CREATE TABLE public.chef_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chef_conversations TO authenticated;
GRANT ALL ON public.chef_conversations TO service_role;
ALTER TABLE public.chef_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chef_conversations owner all" ON public.chef_conversations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chef_conv_user_last_msg_idx ON public.chef_conversations(user_id, last_message_at DESC);

-- ============ CHEF MESSAGES ============
CREATE TABLE public.chef_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chef_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.chef_message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chef_messages TO authenticated;
GRANT ALL ON public.chef_messages TO service_role;
ALTER TABLE public.chef_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chef_messages owner all" ON public.chef_messages
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chef_messages_conv_idx ON public.chef_messages(conversation_id, created_at);

-- ============ updated_at TRIGGERS ============
CREATE TRIGGER trg_pantry_items_updated_at BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meal_plan_updated_at BEFORE UPDATE ON public.meal_plan_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_grocery_items_updated_at BEFORE UPDATE ON public.grocery_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chef_conv_updated_at BEFORE UPDATE ON public.chef_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
