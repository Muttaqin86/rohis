import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { claimJuz, finishJuz, getBoard, startReading } from "@/lib/khatam.functions";

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
              <ul className="space-y-1 text-sm text-muted-foreground">
                {data!.riwayat.map((r) => (
                  <li key={`${r.juz_number}-${r.finished_at}`}>
                    Juz {r.juz_number} — selesai{" "}
                    {r.finished_at
                      ? new Date(r.finished_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
