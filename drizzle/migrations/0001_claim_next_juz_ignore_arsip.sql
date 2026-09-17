CREATE OR REPLACE FUNCTION public.claim_next_juz(_user_id uuid)
RETURNS public.juz_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
      VALUES (
        COALESCE((SELECT MAX(nomor_putaran) FROM public.khatam_rounds WHERE status <> 'arsip'), 0) + 1,
        'aktif'
      )
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
$fn$;