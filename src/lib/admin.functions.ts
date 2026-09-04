import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ResetRequest = {
  id: string;
  nik: string;
  nama: string;
  phone: string;
  created_at: string;
};

/** Normalisasi nomor ke format internasional untuk wa.me (08xx -> 628xx). */
export const normalizeWaNumber = (phone: string) => {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return digits;
};

/** Daftar permintaan reset kata sandi yang menunggu (khusus admin). */
export const getResetRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: requests, error } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id, nik, user_id, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!requests?.length) return [] as ResetRequest[];

    const ids = requests.map((r) => r.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nama, phone")
      .in("id", ids);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return requests
      .map((r) => {
        const p = byId.get(r.user_id);
        return {
          id: r.id,
          nik: r.nik,
          nama: p?.nama ?? "-",
          phone: p?.phone ?? "",
          created_at: r.created_at,
        };
      })
      .filter((r) => r.phone) as ResetRequest[];
  });

/** Buat tautan reset lalu kembalikan URL wa.me siap kirim (khusus admin). */
export const fulfillResetRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { requestId: string; redirectTo: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    if (!/^https?:\/\/[^\s]+\/reset-password$/.test(data.redirectTo)) {
      throw new Error("Alamat pengalihan tidak valid");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: request } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id, user_id, nik, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!request || request.status !== "pending") throw new Error("Permintaan tidak ditemukan");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("nama, phone")
      .eq("id", request.user_id)
      .maybeSingle();
    if (!profile?.phone) throw new Error("Nomor WhatsApp user tidak tersedia");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(request.user_id);
    const email = userRes.user?.email;
    if (!email) throw new Error("Email akun tidak ditemukan");

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: data.redirectTo },
    });
    if (linkErr) throw new Error(linkErr.message);
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) throw new Error("Gagal membuat tautan reset");

    await supabaseAdmin
      .from("password_reset_requests")
      .update({ status: "sent", handled_at: new Date().toISOString() })
      .eq("id", request.id);


    const message = [
      `Assalamu'alaikum ${profile.nama},`,
      "",
      "Berikut tautan untuk mengatur ulang kata sandi akun Khatam Qur'an Anda:",
      actionLink,
      "",
      "Tautan ini hanya bisa dipakai satu kali. Abaikan pesan ini jika Anda tidak meminta reset.",
    ].join("\n");

    return { waUrl: `https://wa.me/${normalizeWaNumber(profile.phone)}?text=${encodeURIComponent(message)}` };
  });
