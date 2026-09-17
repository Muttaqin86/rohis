import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminReport, startNewRound } from "@/lib/admin.functions";
import { getMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/laporan")({
  head: () => ({
    meta: [
      { title: "Laporan Khatam | Admin" },
      { name: "description", content: "Laporan progres khatam seluruh peserta (khusus admin)." },
      { property: "og:title", content: "Laporan Khatam | Admin" },
      { property: "og:description", content: "Laporan progres khatam seluruh peserta (khusus admin)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LaporanPage,
});

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

function LaporanPage() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const isAdmin = !!profile?.is_admin;

  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [profileLoading, profile, isAdmin, navigate]);

  const [scope, setScope] = useState<"all" | "no-arsip">("all");

  const fetchReport = useServerFn(getAdminReport);
  const { data: report, isLoading } = useQuery({
    queryKey: ["admin-report", scope],
    queryFn: () => fetchReport({ data: { excludeArchived: scope === "no-arsip" } }),
    enabled: isAdmin,
  });

  const queryClient = useQueryClient();
  const doStartNewRound = useServerFn(startNewRound);
  const resetRound = useMutation({
    mutationFn: (resetToFirst: boolean) => doStartNewRound({ data: { resetToFirst } }),
    onSuccess: (res) => {
      toast.success(
        res.archived
          ? `Riwayat lama diarsipkan — khatam dimulai lagi dari Putaran ${res.nomor_putaran}`
          : `Putaran baru dimulai — Putaran ${res.nomor_putaran}, Juz kembali dari 1`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-report"] });
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Gagal memulai putaran baru"),
  });

  if (profileLoading || (isAdmin && isLoading)) {
    return (
      <main className="min-h-screen bg-background p-6">
        <p className="text-sm text-muted-foreground">Memuat laporan...</p>
      </main>
    );
  }

  if (!isAdmin) return null;

  const s = report?.summary;
  const cards = [
    { label: "Total Peserta", value: s?.total_peserta ?? 0 },
    { label: "Total Putaran Khatam", value: s?.total_putaran ?? 0 },
    { label: "Total Juz Selesai", value: s?.total_juz_selesai ?? 0 },
    { label: "Juz Sedang Dibaca", value: s?.juz_dibaca ?? 0 },
    { label: "Permintaan Reset Pending", value: s?.reset_pending ?? 0 },
  ];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Tim Kerohanian Islam
            </p>
            <h1 className="text-lg font-bold text-foreground">Laporan Khatam (Admin)</h1>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-primary">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mulai Putaran Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Menutup putaran yang sedang berjalan dan memulai putaran baru dari Juz 1. Juz yang
              belum selesai akan dilepas agar bisa diambil ulang; riwayat Juz yang sudah selesai
              tetap tersimpan.
            </p>
            <div className="flex flex-wrap gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={resetRound.isPending}>
                    {resetRound.isPending ? "Memproses..." : "Mulai dari Juz 1 lagi"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mulai putaran baru?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua Juz yang belum selesai pada putaran ini akan dilepas dan pembagian Juz
                      dimulai kembali dari Juz 1. Tindakan ini tidak bisa dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resetRound.mutate(false)}>
                      Ya, mulai putaran baru
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={resetRound.isPending}>
                    Reset ke Putaran 1
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset penomoran ke Putaran 1?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Seluruh putaran lama akan diarsipkan — riwayat Juz yang sudah selesai tetap
                      tersimpan dan ditandai &quot;(arsip)&quot;. Khatam kemudian dimulai lagi dari
                      Putaran 1, Juz 1. Tindakan ini tidak bisa dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resetRound.mutate(true)}>
                      Ya, reset ke Putaran 1
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progres per Peserta</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Lokasi Kerja</TableHead>
                  <TableHead className="text-right">Juz Selesai</TableHead>
                  <TableHead className="text-right">Juz Aktif</TableHead>
                  <TableHead>Terakhir Selesai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.perUser ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nama}</TableCell>
                    <TableCell>{u.nik}</TableCell>
                    <TableCell>{u.divisi || "-"}</TableCell>
                    <TableCell>{u.lokasi_kerja || "-"}</TableCell>
                    <TableCell className="text-right">{u.juz_selesai}</TableCell>
                    <TableCell className="text-right">{u.juz_aktif}</TableCell>
                    <TableCell>{formatDateTime(u.terakhir_selesai)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
