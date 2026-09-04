import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyProfile = {
  id: string;
  nik: string;
  nama: string;
  email: string | null;
  phone: string | null;
  lokasi_kerja: string | null;
  divisi: string | null;
  is_admin: boolean;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, nik, nama, email, phone, lokasi_kerja, divisi")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { ...(data as Omit<MyProfile, "is_admin">), is_admin: !!isAdmin } as MyProfile;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      nama?: string;
      email?: string;
      phone?: string;
      lokasiKerja?: string;
      divisi?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const email = data.email?.trim() ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Format email tidak valid");
    }
    const phone = (data.phone ?? "").replace(/[^\d+]/g, "");
    if (phone && !/^\+?\d{9,15}$/.test(phone)) {
      throw new Error("Nomor WhatsApp tidak valid, contoh: 08123456789");
    }

    const nama = data.nama?.trim() ?? "";
    if (!nama) {
      throw new Error("Nama wajib diisi");
    }

    const patch = {
      nama,
      email: email || null,
      phone: phone || null,
      lokasi_kerja: data.lokasiKerja?.trim() || null,
      divisi: data.divisi?.trim() || null,
    };

    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId)
      .select("id, nik, nama, email, phone, lokasi_kerja, divisi")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { ...(row as Omit<MyProfile, "is_admin">), is_admin: !!isAdmin } as MyProfile;
  });
