CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nik text NOT NULL UNIQUE,
  nama text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.khatam_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_putaran integer NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'aktif',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.khatam_rounds TO authenticated;
GRANT ALL ON public.khatam_rounds TO service_role;
ALTER TABLE public.khatam_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rounds_select_authenticated" ON public.khatam_rounds FOR SELECT TO authenticated USING (true);

CREATE TABLE public.juz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.khatam_rounds(id) ON DELETE CASCADE,
  juz_number integer NOT NULL CHECK (juz_number BETWEEN 1 AND 30),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'diambil',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, juz_number)
);
GRANT SELECT, UPDATE ON public.juz_assignments TO authenticated;
GRANT ALL ON public.juz_assignments TO service_role;
ALTER TABLE public.juz_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_select_authenticated" ON public.juz_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "assignments_update_own" ON public.juz_assignments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nik, nama)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nik', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'nama', 'Karyawan')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.claim_next_juz(_user_id uuid)
RETURNS public.juz_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing public.juz_assignments;
  _round public.khatam_rounds;
  _next_juz integer;
  _result public.juz_assignments;
BEGIN
  SELECT * INTO _existing FROM public.juz_assignments
   WHERE user_id = _user_id AND status <> 'selesai'
   ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN _existing;
  END IF;

  LOOP
    SELECT * INTO _round FROM public.khatam_rounds
     WHERE status = 'aktif' ORDER BY nomor_putaran DESC LIMIT 1 FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.khatam_rounds (nomor_putaran, status)
      VALUES (COALESCE((SELECT MAX(nomor_putaran) FROM public.khatam_rounds), 0) + 1, 'aktif')
      RETURNING * INTO _round;
    END IF;

    SELECT g.n INTO _next_juz
      FROM generate_series(1, 30) AS g(n)
     WHERE NOT EXISTS (
       SELECT 1 FROM public.juz_assignments a
        WHERE a.round_id = _round.id AND a.juz_number = g.n
     )
     ORDER BY g.n LIMIT 1;

    IF _next_juz IS NULL THEN
      UPDATE public.khatam_rounds SET status = 'penuh' WHERE id = _round.id;
      CONTINUE;
    END IF;

    INSERT INTO public.juz_assignments (round_id, juz_number, user_id, status)
    VALUES (_round.id, _next_juz, _user_id, 'diambil')
    RETURNING * INTO _result;

    RETURN _result;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_next_juz(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_next_juz(uuid) TO service_role;