DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.get_display_names(_ids uuid[])
RETURNS TABLE (id uuid, nama text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nama
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
$$;

REVOKE ALL ON FUNCTION public.get_display_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_display_names(uuid[]) TO authenticated;