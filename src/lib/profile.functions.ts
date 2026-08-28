import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyProfile = {
  id: string;
  nik: string;
  nama: string;
  email: string | null;
  lokasi_kerja: string | null;
  divisi: string | null;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, nik, nama, email, lokasi_kerja, divisi")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as MyProfile | null;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { nama?: string; email?: string; lokasiKerja?: string; divisi?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const email = data.email?.trim() ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Format email tidak valid");
    }

    const patch = {
      email: email || null,
      lokasi_kerja: data.lokasiKerja?.trim() || null,
      divisi: data.divisi?.trim() || null,
      ...(data.nama?.trim() ? { nama: data.nama.trim() } : {}),
    };

    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId)
      .select("id, nik, nama, email, lokasi_kerja, divisi")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as MyProfile | null;
  });
