-- Izinkan putaran baru memakai nomor yang sama dengan putaran lama yang sudah diarsipkan
ALTER TABLE public.khatam_rounds DROP CONSTRAINT khatam_rounds_nomor_putaran_key;
CREATE UNIQUE INDEX khatam_rounds_nomor_putaran_active_key
  ON public.khatam_rounds (nomor_putaran)
  WHERE status <> 'arsip';