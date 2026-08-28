ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lokasi_kerja text,
  ADD COLUMN IF NOT EXISTS divisi text;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;