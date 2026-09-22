GRANT SELECT, INSERT, UPDATE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

CREATE POLICY "recipes insert authenticated" ON public.recipes
  FOR INSERT TO authenticated WITH CHECK (source = 'spoonacular');

CREATE POLICY "recipes update authenticated" ON public.recipes
  FOR UPDATE TO authenticated USING (source = 'spoonacular') WITH CHECK (source = 'spoonacular');