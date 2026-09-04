import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminReport } from "@/lib/admin.functions";
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
  const fetchReport = useServerFn(getAdminReport);

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

  const { data: report, isLoading } = useQuery({
    queryKey: ["admin-report"],
    queryFn: () => fetchReport(),
    enabled: isAdmin,
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
