import { createServerFn } from "@tanstack/react-start";

export type Ayah = {
  number: number;
  text: string;
  numberInSurah: number;
  surahName: string;
  surahNumber: number;
};

export const getJuzText = createServerFn({ method: "GET" })
  .inputValidator((input: { juz: number }) => {
    const juz = Number(input.juz);
    if (!Number.isInteger(juz) || juz < 1 || juz > 30) throw new Error("Juz tidak valid");
    return { juz };
  })
  .handler(async ({ data }) => {
    const res = await fetch(
      `https://api.alquran.cloud/v1/juz/${data.juz}/quran-uthmani`,
    );
    if (!res.ok) throw new Error("Gagal memuat teks Al-Qur'an");
    const json = (await res.json()) as {
      data: {
        ayahs: Array<{
          number: number;
          text: string;
          numberInSurah: number;
          surah: { number: number; name: string; englishName: string };
        }>;
      };
    };
    const ayahs: Ayah[] = json.data.ayahs.map((a) => ({
      number: a.number,
      text: a.text,
      numberInSurah: a.numberInSurah,
      surahName: `${a.surah.englishName} (${a.surah.name})`,
      surahNumber: a.surah.number,
    }));
    return { juz: data.juz, ayahs };
  });

export type MushafPage = {
  page: number;
  ayahs: Ayah[];
};

// Halaman awal tiap juz pada mushaf Madinah 15 baris (total 604 halaman)
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282,
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export const getJuzPages = createServerFn({ method: "GET" })
  .inputValidator((input: { juz: number }) => {
    const juz = Number(input.juz);
    if (!Number.isInteger(juz) || juz < 1 || juz > 30) throw new Error("Juz tidak valid");
    return { juz };
  })
  .handler(async ({ data }) => {
    const start = JUZ_START_PAGES[data.juz - 1]!;
    const end = data.juz === 30 ? 604 : JUZ_START_PAGES[data.juz]! - 1;
    const pages: MushafPage[] = [];
    for (let p = start; p <= end; p++) {
      const res = await fetch(
        `https://api.alquran.cloud/v1/page/${p}/quran-uthmani`,
      );
      if (!res.ok) throw new Error("Gagal memuat halaman mushaf");
      const json = (await res.json()) as {
        data: {
          ayahs: Array<{
            number: number;
            text: string;
            numberInSurah: number;
            surah: { number: number; name: string; englishName: string };
          }>;
        };
      };
      pages.push({
        page: p,
        ayahs: json.data.ayahs.map((a) => ({
          number: a.number,
          text: a.text,
          numberInSurah: a.numberInSurah,
          surahName: `${a.surah.englishName} (${a.surah.name})`,
          surahNumber: a.surah.number,
        })),
      });
    }
    return { juz: data.juz, pages };
  });
