import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Atur Ulang Kata Sandi | Khatam Qur'an Bersama" },
      {
        name: "description",
        content:
          "Buat kata sandi baru untuk akun khatam Al-Qur'an tim kerohanian islam melalui tautan yang dikirim ke email.",
      },
      { property: "og:title", content: "Atur Ulang Kata Sandi | Khatam Qur'an Bersama" },
      {
        property: "og:description",
        content: "Buat kata sandi baru untuk akun khatam Al-Qur'an Anda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }
    if (password !== confirm) {
      toast.error("Konfirmasi kata sandi tidak sama");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kata sandi berhasil diperbarui");
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-foreground">Atur ulang kata sandi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ready
            ? "Masukkan kata sandi baru untuk akun Anda."
            : "Membuka tautan dari email... Jika halaman ini tetap kosong, minta tautan baru dari halaman masuk."}
        </p>

        {ready ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw-baru">Kata sandi baru</Label>
              <Input
                id="pw-baru"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-konfirmasi">Ulangi kata sandi baru</Label>
              <Input
                id="pw-konfirmasi"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan kata sandi"}
            </Button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
