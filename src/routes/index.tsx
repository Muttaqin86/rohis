import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Khatam Qur'an Bersama | Tim Kerohanian Islam" },
      {
        name: "description",
        content:
          "Aplikasi khatam Al-Qur'an tim kerohanian islam: masuk dengan NIK, dapatkan satu Juz otomatis, baca, lalu tandai selesai.",
      },
      { property: "og:title", content: "Khatam Qur'an Bersama | Tim Kerohanian Islam" },
      {
        property: "og:description",
        content: "Ambil Juz secara berurutan, baca di aplikasi, dan pantau progres khatam tim.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const nikToEmail = (nik: string) => `${nik.trim().toLowerCase()}@khatam.local`;

function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: nikToEmail(nik),
      password,
    });
    setLoading(false);
    if (error) {
      toast.error("NIK atau kata sandi salah");
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: nikToEmail(nik),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nik: nik.trim(), nama: nama.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("already")
          ? "NIK ini sudah terdaftar, silakan masuk"
          : error.message,
      );
      return;
    }
    toast.success("Pendaftaran berhasil");
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-center">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-foreground">
            Tim Kerohanian Islam
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            Khatam Al-Qur&apos;an Bersama, Satu Orang Satu Juz
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            Masuk dengan NIK karyawan, ambil satu Juz secara otomatis sesuai urutan, baca langsung
            di aplikasi, lalu tandai selesai. Setiap 30 Juz terkumpul, putaran khatam berikutnya
            terbuka sendiri.
          </p>
          <p
            dir="rtl"
            className="mt-8 font-arabic text-3xl leading-loose text-primary"
          >
            خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <Tabs defaultValue="masuk">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="masuk">Masuk</TabsTrigger>
              <TabsTrigger value="daftar">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="masuk">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="nik-masuk">NIK</Label>
                  <Input
                    id="nik-masuk"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    placeholder="Contoh: 220145"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw-masuk">Kata sandi</Label>
                  <Input
                    id="pw-masuk"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memproses..." : "Masuk"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="daftar">
              <form onSubmit={handleSignup} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="nik-daftar">NIK</Label>
                  <Input
                    id="nik-daftar"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nama-daftar">Nama lengkap</Label>
                  <Input
                    id="nama-daftar"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw-daftar">Kata sandi</Label>
                  <Input
                    id="pw-daftar"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memproses..." : "Daftar"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Lupa kata sandi? Hubungi admin kerohanian untuk direset.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  );
}
