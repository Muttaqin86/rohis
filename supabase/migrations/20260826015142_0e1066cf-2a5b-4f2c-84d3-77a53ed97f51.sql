ALTER TABLE public.juz_assignments
  ADD COLUMN IF NOT EXISTS last_surah_number integer,
  ADD COLUMN IF NOT EXISTS last_surah_name text,
  ADD COLUMN IF NOT EXISTS last_ayah_number integer,
  ADD COLUMN IF NOT EXISTS last_read_at timestamp with time zone;