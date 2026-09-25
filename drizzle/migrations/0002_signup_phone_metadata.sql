CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nik, nama, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nik', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'nama', 'Karyawan'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$function$;

-- Backfill: isi nomor HP dari data pendaftaran yang tersimpan pada metadata akun
UPDATE public.profiles p
SET phone = u.raw_user_meta_data ->> 'phone'
FROM auth.users u
WHERE u.id = p.id
  AND p.phone IS NULL
  AND u.raw_user_meta_data ->> 'phone' IS NOT NULL;