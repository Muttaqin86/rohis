DROP POLICY IF EXISTS assignments_select_authenticated ON public.juz_assignments;
CREATE POLICY assignments_select_own_or_admin ON public.juz_assignments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS rounds_select_authenticated ON public.khatam_rounds;
CREATE POLICY rounds_select_admin ON public.khatam_rounds
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));