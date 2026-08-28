import { createServerFn } from "@tanstack/react-start";

const isSyntheticEmail = (email: string | null | undefined) =>
  !!email && email.toLowerCase().endsWith("@khatam.local");

const maskEmail = (email: string) => {
  const [user, domain] = email.split("@");
  const head = (user ?? "").slice(0, 2);
  return `${head}${"*".repeat(Math.max((user ?? "").length - 2, 1))}@${domain ?? ""}`;
};

/** Cari akun berdasarkan NIK, lalu masuk memakai email akun tersebut. */
export const signInWithNik = createServerFn({ method: "POST" })
  .inputValidator((input: { nik: string; password: string }) => input)
  .handler(async ({ data }) => {
    const nik = data.nik.trim();
    if (!nik || !data.password) throw new Error("NIK dan kata sandi wajib diisi");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("nik", nik)
      .maybeSingle();

    let email = profile ? null : `${nik.toLowerCase()}@khatam.local`;
    if (profile) {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      email = userRes.user?.email ?? `${nik.toLowerCase()}@khatam.local`;
    }

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: signIn, error } = await client.auth.signInWithPassword({
      email: email!,
      password: data.password,
    });
    if (error || !signIn.session) throw new Error("NIK atau kata sandi salah");

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });

/** Kirim tautan atur ulang kata sandi ke email yang tersimpan pada profil. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { nik: string; redirectTo: string }) => input)
  .handler(async ({ data }) => {
    const nik = data.nik.trim();
    if (!nik) throw new Error("NIK wajib diisi");
    if (!/^https?:\/\/[^\s]+\/reset-password$/.test(data.redirectTo)) {
      throw new Error("Alamat pengalihan tidak valid");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("nik", nik)
      .maybeSingle();

    if (!profile) throw new Error("NIK tidak ditemukan");
    if (!profile.email || isSyntheticEmail(profile.email)) {
      throw new Error(
        "Akun ini belum punya email. Hubungi admin kerohanian untuk mengisi email pada profil.",
      );
    }

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const authEmail = userRes.user?.email ?? null;
    if (authEmail?.toLowerCase() !== profile.email.toLowerCase()) {
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
        email: profile.email,
        email_confirm: true,
      });
      if (updErr) throw new Error(updErr.message);
    }

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { error } = await client.auth.resetPasswordForEmail(profile.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);

    return { email: maskEmail(profile.email) };
  });
