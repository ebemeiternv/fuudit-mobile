DROP POLICY IF EXISTS "recipes insert authenticated" ON public.recipes;
DROP POLICY IF EXISTS "recipes update authenticated" ON public.recipes;

CREATE POLICY "recipes insert authenticated" ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK (source IN ('spoonacular', 'fuudit_ai'));

CREATE POLICY "recipes update authenticated" ON public.recipes
  FOR UPDATE TO authenticated
  USING (source IN ('spoonacular', 'fuudit_ai'))
  WITH CHECK (source IN ('spoonacular', 'fuudit_ai'));