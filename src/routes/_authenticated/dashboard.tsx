import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { claimJuz, finishJuz, getBoard, startReading } from "@/lib/khatam.functions";
import { fulfillResetRequest, getResetRequests } from "@/lib/admin.functions";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Beranda Khatam | Ambil & Pantau Juz" },
      {
        name: "description",
        content: "Ambil Juz Anda, mulai membaca, tandai selesai, dan lihat progres khatam tim.",
      },
      { property: "og:title", content: "Beranda Khatam | Ambil & Pantau Juz" },
      {
        property: "og:description",
        content: "Ambil Juz Anda, mulai membaca, tandai selesai, dan lihat progres khatam tim.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function statusLabel(status: string) {
  if (status === "selesai") return "Selesai";
  if (status === "dibaca") return "Sedang dibaca";
  if (status === "diambil") return "Diambil";
  return "Kosong";
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProfileCard() {
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lokasiKerja, setLokasiKerja] = useState("");
  const [divisi, setDivisi] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  useEffect(() => {
    if (!profile) return;
    setEmail(profile.email ?? "");
    setPhone(profile.phone ?? "");
    setLokasiKerja(profile.lokasi_kerja ?? "");
    setDivisi(profile.divisi ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: () => saveProfile({ data: { email, phone, lokasiKerja, divisi } }),
    onSuccess: () => {
      toast.success("Profil tersimpan");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Profil Saya</CardTitle>
        {!editing && !isLoading && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {profile?.lokasi_kerja || profile?.divisi || profile?.email || profile?.phone
              ? "Edit"
              : "Lengkapi"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : editing ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="profil-email">Email</Label>
              <Input
                id="profil-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.co.id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profil-wa">Nomor WhatsApp</Label>
              <Input
                id="profil-wa"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789"
              />
              <p className="text-xs text-muted-foreground">
                Dipakai admin untuk mengirim tautan reset kata sandi lewat WhatsApp.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profil-lokasi">Lokasi kerja</Label>
              <Input
                id="profil-lokasi"
                value={lokasiKerja}
                onChange={(e) => setLokasiKerja(e.target.value)}
                placeholder="Contoh: Kantor Pusat Jakarta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profil-divisi">Divisi</Label>
              <Input
                id="profil-divisi"
                value={divisi}
                onChange={(e) => setDivisi(e.target.value)}
                placeholder="Contoh: Produksi"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEmail(profile?.email ?? "");
                  setPhone(profile?.phone ?? "");
                  setLokasiKerja(profile?.lokasi_kerja ?? "");
                  setDivisi(profile?.divisi ?? "");
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Nama</p>
              <p className="text-sm font-medium text-foreground">{profile?.nama ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">NIK</p>
              <p className="text-sm font-medium text-foreground">{profile?.nik ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-foreground">{profile?.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">WhatsApp</p>
              <p className="text-sm font-medium text-foreground">{profile?.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lokasi kerja</p>
              <p className="text-sm font-medium text-foreground">{profile?.lokasi_kerja || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Divisi</p>
              <p className="text-sm font-medium text-foreground">{profile?.divisi || "-"}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResetRequestsCard() {
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchRequests = useServerFn(getResetRequests);
  const fulfill = useServerFn(fulfillResetRequest);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const isAdmin = !!profile?.is_admin;

  const { data: requests, isLoading } = useQuery({
    queryKey: ["reset-requests"],
    queryFn: () => fetchRequests(),
    enabled: isAdmin,
  });

  const fulfillMut = useMutation({
    mutationFn: (requestId: string) =>
      fulfill({ data: { requestId, redirectTo: `${window.location.origin}/reset-password` } }),
    onSuccess: (res) => {
      window.open(res.waUrl, "_blank", "noopener");
      toast.success("Tautan dibuat, WhatsApp terbuka — tinggal kirim pesannya");
      queryClient.invalidateQueries({ queryKey: ["reset-requests"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Gagal membuat tautan reset"),
  });

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permintaan Reset Kata Sandi (Admin)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : (requests ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada permintaan yang menunggu.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIK</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Waktu Permintaan</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nik}</TableCell>
                  <TableCell>{r.nama}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell>{formatDateTime(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => fulfillMut.mutate(r.id)}
                      disabled={fulfillMut.isPending}
                    >
                      Kirim via WhatsApp
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(getBoard);
  const doClaim = useServerFn(claimJuz);
  const doStart = useServerFn(startReading);
  const doFinish = useServerFn(finishJuz);

  const { data, isLoading } = useQuery({
    queryKey: ["board"],
    queryFn: () => fetchBoard(),
  });

  const claim = useMutation({
    mutationFn: () => doClaim(),
    onSuccess: (res) => {
      toast.success(`Anda mendapat Juz ${res.juz_number}`);
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
    onError: (err: unknown) =>
      toast.error(
        err instanceof Error && err.message
          ? `Gagal mengambil Juz: ${err.message}`
          : "Gagal mengambil Juz, coba lagi",
      ),
  });

  const finish = useMutation({
    mutationFn: (assignmentId: string) => doFinish({ data: { assignmentId } }),
    onSuccess: () => {
      toast.success("Alhamdulillah, Juz Anda telah selesai");
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  async function handleStart(assignmentId: string, juz: number) {
    await doStart({ data: { assignmentId } });
    queryClient.invalidateQueries({ queryKey: ["board"] });
    navigate({ to: "/baca/$juz", params: { juz: String(juz) } });
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const active = data?.active ?? null;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Tim Kerohanian Islam
            </p>
            <h1 className="text-lg font-bold text-foreground">Khatam Al-Qur&apos;an</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Keluar
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <ProfileCard />

        <Card>
          <CardHeader>
            <CardTitle>Juz Saya</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : active ? (
              <>
                <p className="font-arabic text-5xl text-primary">
                  Juz {active.juz_number}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {statusLabel(active.status)}
                </p>
                {active.started_at && (
                  <p className="text-sm text-muted-foreground">
                    Dimulai: {formatDateTime(active.started_at)}
                  </p>
                )}
                {active.finished_at && (
                  <p className="text-sm text-muted-foreground">
                    Selesai: {formatDateTime(active.finished_at)}
                  </p>
                )}
                {active.last_surah_name && active.last_ayah_number && (
                  <div className="rounded-lg border border-primary/40 bg-accent p-3 text-sm">
                    <p className="font-medium text-foreground">
                      Terakhir baca: Juz {active.juz_number} — {active.last_surah_name} ayat{" "}
                      {active.last_ayah_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ditandai: {formatDateTime(active.last_read_at)}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => handleStart(active.id, active.juz_number)}>
                    {active.status === "dibaca" ? "Lanjut baca" : "Mulai"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => finish.mutate(active.id)}
                    disabled={finish.isPending}
                  >
                    Selesai
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Anda belum memegang Juz. Ambil satu Juz untuk ikut khatam.
                </p>
                <Button onClick={() => claim.mutate()} disabled={claim.isPending}>
                  {claim.isPending ? "Memproses..." : "Ambil Juz"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Papan Progres
              {data?.round ? ` — Putaran ${data.round.nomor}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Total Juz selesai seluruh putaran: {data?.totalSelesai ?? 0}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(data?.board ?? []).map((j) => (
                <div
                  key={j.juz_number}
                  className={`rounded-lg border p-3 ${
                    j.isMine ? "border-primary bg-accent" : "border-border bg-card"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">Juz {j.juz_number}</p>
                  <p className="text-xs text-muted-foreground">{statusLabel(j.status)}</p>
                  {j.nama && (
                    <p className="mt-1 truncate text-xs text-foreground/80">{j.nama}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {(data?.riwayat ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Khatam Saya</CardTitle>
            </CardHeader>
            <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Juz</TableHead>
                  <TableHead>Waktu Mulai</TableHead>
                  <TableHead>Waktu Selesai</TableHead>
                  <TableHead>Putaran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.riwayat.map((r) => (
                  <TableRow key={`${r.juz_number}-${r.finished_at}`}>
                    <TableCell className="font-medium">Juz {r.juz_number}</TableCell>
                    <TableCell>{formatDateTime(r.started_at)}</TableCell>
                    <TableCell>{formatDateTime(r.finished_at)}</TableCell>
                    <TableCell>{r.round_number ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
