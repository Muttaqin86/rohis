import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BookOpen, List } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getJuzPages, getJuzText, type Ayah } from "@/lib/quran.functions";
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

type MarkFn = (v: { surahNumber: number; surahName: string; ayahNumber: number }) => void;

function AyahBlock({
  ayah,
  showSurah,
  isLast,
  canMark,
  markPending,
  onMark,
}: {
  ayah: Ayah;
  showSurah: boolean;
  isLast: boolean;
  canMark: boolean;
  markPending: boolean;
  onMark: MarkFn;
}) {
  return (
    <div
      id={`ayat-${ayah.surahNumber}-${ayah.numberInSurah}`}
      className={isLast ? "rounded-lg border border-primary/50 bg-accent/50 p-3" : undefined}
    >
      {showSurah && (
        <h2 className="mb-4 border-b border-border pb-2 text-sm font-semibold uppercase tracking-widest text-accent-foreground">
          {ayah.surahNumber}. {ayah.surahName}
        </h2>
      )}
      <p dir="rtl" className="font-arabic text-3xl leading-[2.6] text-foreground">
        {ayah.text}
        <span className="mx-2 align-middle text-base text-muted-foreground">
          ﴿{ayah.numberInSurah}﴾
        </span>
      </p>
      {canMark && (
        <div className="mt-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={markPending}
            onClick={() =>
              onMark({
                surahNumber: ayah.surahNumber,
                surahName: ayah.surahName,
                ayahNumber: ayah.numberInSurah,
              })
            }
          >
            {isLast ? "Batas baca terakhir" : "Tandai sampai sini"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Baca() {
  const { juz } = useParams({ from: "/_authenticated/baca/$juz" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchText = useServerFn(getJuzText);
  const fetchPages = useServerFn(getJuzPages);
  const fetchBoard = useServerFn(getBoard);
  const doFinish = useServerFn(finishJuz);
  const doSave = useServerFn(saveProgress);

  const [mode, setMode] = useState<"ayat" | "mushaf">("ayat");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["juz-text", juz],
    queryFn: () => fetchText({ data: { juz: Number(juz) } }),
    staleTime: 1000 * 60 * 60,
  });

  const pagesQuery = useQuery({
    queryKey: ["juz-pages", juz],
    queryFn: () => fetchPages({ data: { juz: Number(juz) } }),
    staleTime: 1000 * 60 * 60,
    enabled: mode === "mushaf",
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

  const mark = useMutation({
    mutationFn: (v: { surahNumber: number; surahName: string; ayahNumber: number }) =>
      doSave({ data: { assignmentId: active!.id, ...v } }),
    onSuccess: (_r, v) => {
      toast.success(`Batas baca disimpan: ${v.surahName} ayat ${v.ayahNumber}`);
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
    onError: () => toast.error("Gagal menyimpan batas baca"),
  });

  const isMine = !!active && active.juz_number === Number(juz);
  const lastSurah = active?.last_surah_number ?? null;
  const lastAyah = active?.last_ayah_number ?? null;
  const lastId = lastSurah && lastAyah ? `ayat-${lastSurah}-${lastAyah}` : null;

  let currentSurah = "";

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sedang dibaca</p>
            <h1 className="text-lg font-bold text-foreground">Juz {juz}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-border">
              <Button
                variant={mode === "ayat" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setMode("ayat")}
              >
                <List className="size-4" />
                Ayat
              </Button>
              <Button
                variant={mode === "mushaf" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setMode("mushaf")}
              >
                <BookOpen className="size-4" />
                Mushaf
              </Button>
            </div>
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
        {mode === "ayat" && (
          <>
            {isLoading && <p className="text-sm text-muted-foreground">Memuat teks Al-Qur&apos;an...</p>}
            {isError && (
              <p className="text-sm text-destructive">
                Gagal memuat teks. Periksa koneksi lalu muat ulang halaman.
              </p>
            )}
          </>
        )}
        {mode === "mushaf" && (
          <>
            {pagesQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Memuat halaman mushaf (sekitar 20 halaman)...</p>
            )}
            {pagesQuery.isError && (
              <p className="text-sm text-destructive">
                Gagal memuat mushaf. Periksa koneksi lalu muat ulang halaman.
              </p>
            )}
          </>
        )}
        {isMine && lastId && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-accent p-4">
            <p className="text-sm text-foreground">
              Terakhir dibaca: <strong>{active?.last_surah_name}</strong> ayat {lastAyah}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                document.getElementById(lastId)?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            >
              Lanjutkan dari sini
            </Button>
          </div>
        )}

        {mode === "ayat" ? (
          <div className="space-y-6">
            {(data?.ayahs ?? []).map((a) => {
              const showSurah = a.surahName !== currentSurah;
              currentSurah = a.surahName;
              return (
                <AyahBlock
                  key={a.number}
                  ayah={a}
                  showSurah={showSurah}
                  isLast={a.surahNumber === lastSurah && a.numberInSurah === lastAyah}
                  canMark={isMine}
                  markPending={mark.isPending}
                  onMark={(v) => mark.mutate(v)}
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-8">
            {(pagesQuery.data?.pages ?? []).map((p) => {
              let pageSurah = "";
              return (
                <section
                  key={p.page}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8"
                >
                  <div
                    dir="rtl"
                    className="border-y-2 border-border py-6 text-justify font-arabic text-[1.6rem] leading-[2.9] text-foreground sm:text-3xl"
                    style={{ textAlignLast: "center" }}
                  >
                    {p.ayahs.map((a) => {
                      const showSurah = a.surahName !== pageSurah;
                      pageSurah = a.surahName;
                      const isLast =
                        a.surahNumber === lastSurah && a.numberInSurah === lastAyah;
                      return (
                        <span key={a.number}>
                          {showSurah && (
                            <span className="my-4 flex items-center justify-center gap-3 rounded-md border-2 border-accent-foreground/40 bg-accent px-4 py-2 text-xl text-accent-foreground">
                              سُورَة {a.surahName.split("(")[1]?.replace(")", "") ?? ""}
                            </span>
                          )}
                          <span
                            id={`ayat-${a.surahNumber}-${a.numberInSurah}`}
                            className={
                              isLast ? "rounded bg-accent px-1 ring-1 ring-primary/50" : undefined
                            }
                          >
                            {a.text}{" "}
                          </span>
                          <button
                            type="button"
                            disabled={!isMine || mark.isPending}
                            title={isMine ? "Tandai batas baca sampai ayat ini" : undefined}
                            onClick={() =>
                              isMine &&
                              mark.mutate({
                                surahNumber: a.surahNumber,
                                surahName: a.surahName,
                                ayahNumber: a.numberInSurah,
                              })
                            }
                            className="mx-1 inline-flex size-8 items-center justify-center rounded-full border border-accent-foreground/40 bg-accent align-middle font-sans text-xs text-accent-foreground transition-colors enabled:hover:bg-secondary"
                          >
                            {a.numberInSurah}
                          </button>{" "}
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-center text-xs text-muted-foreground">۝ {p.page} ۝</p>
                </section>
              );
            })}
          </div>
        )}

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
