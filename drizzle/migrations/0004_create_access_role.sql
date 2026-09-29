CREATE TABLE public.access_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_role TO authenticated;
GRANT ALL ON public.access_role TO service_role;
ALTER TABLE public.access_role ENABLE ROW LEVEL SECURITY;
CREATE POLICY access_role_select_own ON public.access_role FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.access_role (user_id, role)
SELECT DISTINCT user_id, 'admin'::public.app_role FROM public.user_roles WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.access_role
    WHERE user_id = _user_id AND role = _role
  )
$function$;

COMMENT ON TABLE public.user_roles IS 'DEPRECATED: replaced by access_role';