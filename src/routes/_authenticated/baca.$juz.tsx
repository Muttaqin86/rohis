import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getJuzText } from "@/lib/quran.functions";
import { finishJuz, getBoard, saveProgress } from "@/lib/khatam.functions";

export const Route = createFileRoute("/_authenticated/baca/$juz")({
  head: () => ({
    meta: [
      { title: "Baca Juz | Khatam Al-Qur'an Tim" },
      {
        name: "description",
        content: "Baca teks Al-Qur'an Juz yang Anda ambil, lalu tandai selesai bila sudah khatam.",
      },
      { property: "og:title", content: "Baca Juz | Khatam Al-Qur'an Tim" },
      {
        property: "og:description",
        content: "Baca teks Al-Qur'an Juz yang Anda ambil, lalu tandai selesai bila sudah khatam.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground" role="alert">
      {error.message}
    </div>
  ),
  component: Baca,
});

function Baca() {
  const { juz } = useParams({ from: "/_authenticated/baca/$juz" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchText = useServerFn(getJuzText);
  const fetchBoard = useServerFn(getBoard);
  const doFinish = useServerFn(finishJuz);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["juz-text", juz],
    queryFn: () => fetchText({ data: { juz: Number(juz) } }),
    staleTime: 1000 * 60 * 60,
  });

  const { data: board } = useQuery({ queryKey: ["board"], queryFn: () => fetchBoard() });
  const active = board?.active ?? null;

  const finish = useMutation({
    mutationFn: (assignmentId: string) => doFinish({ data: { assignmentId } }),
    onSuccess: () => {
      toast.success(`Alhamdulillah, Juz ${juz} selesai`);
      queryClient.invalidateQueries({ queryKey: ["board"] });
      navigate({ to: "/dashboard" });
    },
  });

  let currentSurah = "";

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sedang dibaca</p>
            <h1 className="text-lg font-bold text-foreground">Juz {juz}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
              Kembali
            </Button>
            {active && active.juz_number === Number(juz) && (
              <Button size="sm" onClick={() => finish.mutate(active.id)} disabled={finish.isPending}>
                Selesai
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {isLoading && <p className="text-sm text-muted-foreground">Memuat teks Al-Qur&apos;an...</p>}
        {isError && (
          <p className="text-sm text-destructive">
            Gagal memuat teks. Periksa koneksi lalu muat ulang halaman.
          </p>
        )}
        <div className="space-y-6">
          {(data?.ayahs ?? []).map((a) => {
            const showSurah = a.surahName !== currentSurah;
            currentSurah = a.surahName;
            return (
              <div key={a.number}>
                {showSurah && (
                  <h2 className="mb-4 border-b border-border pb-2 text-sm font-semibold uppercase tracking-widest text-accent-foreground">
                    {a.surahNumber}. {a.surahName}
                  </h2>
                )}
                <p dir="rtl" className="font-arabic text-3xl leading-[2.6] text-foreground">
                  {a.text}
                  <span className="mx-2 align-middle text-base text-muted-foreground">
                    ﴿{a.numberInSurah}﴾
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        {active && active.juz_number === Number(juz) && (
          <div className="mt-10 flex justify-center">
            <Button size="lg" onClick={() => finish.mutate(active.id)} disabled={finish.isPending}>
              Tandai Juz {juz} Selesai
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
