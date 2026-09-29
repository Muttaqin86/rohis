import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ManagedUser = {
  id: string;
  nik: string;
  nama: string;
  email: string | null;
  phone: string | null;
  lokasi_kerja: string | null;
  divisi: string | null;
  created_at: string;
  is_admin: boolean;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, nik, nama, email, phone, lokasi_kerja, divisi, created_at")
        .order("nama"),
      supabaseAdmin.from("access_role").select("user_id").eq("role", "admin"),
    ]);
    if (error) throw new Error(error.message);
    const admins = new Set((roles ?? []).map((r) => r.user_id));
    return (profiles ?? []).map((p) => ({ ...p, is_admin: admins.has(p.id) })) as ManagedUser[];
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      nama: string;
      email?: string;
      phone?: string;
      lokasiKerja?: string;
      divisi?: string;
      isAdmin: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const nama = data.nama?.trim();
    if (!nama) throw new Error("Nama wajib diisi");
    const email = data.email?.trim() ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Format email tidak valid");
    const phone = (data.phone ?? "").replace(/[^\d+]/g, "");
    if (phone && !/^\+?\d{9,15}$/.test(phone)) throw new Error("Nomor HP tidak valid");
    if (data.id === context.userId && !data.isAdmin) {
      throw new Error("Anda tidak bisa mencabut akses admin milik sendiri");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        nama,
        email: email || null,
        phone: phone || null,
        lokasi_kerja: data.lokasiKerja?.trim() || null,
        divisi: data.divisi?.trim() || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.isAdmin) {
      const { data: existing } = await supabaseAdmin
        .from("access_role")
        .select("id")
        .eq("user_id", data.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!existing) {
        const { error: e } = await supabaseAdmin
          .from("access_role")
          .insert({ user_id: data.id, role: "admin" });
        if (e) throw new Error(e.message);
      }
    } else {
      const { error: e } = await supabaseAdmin
        .from("access_role")
        .delete()
        .eq("user_id", data.id)
        .eq("role", "admin");
      if (e) throw new Error(e.message);
    }
    return { ok: true };
  });
