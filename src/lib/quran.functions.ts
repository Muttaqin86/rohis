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

export const getJuzPages = createServerFn({ method: "GET" })
  .inputValidator((input: { juz: number }) => {
    const juz = Number(input.juz);
    if (!Number.isInteger(juz) || juz < 1 || juz > 30) throw new Error("Juz tidak valid");
    return { juz };
  })
  .handler(async ({ data }) => {
    // Satu request saja: endpoint juz sudah menyertakan nomor halaman tiap ayat
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(
          `https://api.alquran.cloud/v1/juz/${data.juz}/quran-uthmani`,
        );
        if (res.ok) break;
      } catch {
        res = null;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    if (!res || !res.ok) throw new Error("Gagal memuat halaman mushaf");

    const json = (await res.json()) as {
      data: {
        ayahs: Array<{
          number: number;
          text: string;
          numberInSurah: number;
          page: number;
          surah: { number: number; name: string; englishName: string };
        }>;
      };
    };

    const byPage = new Map<number, Ayah[]>();
    for (const a of json.data.ayahs) {
      const list = byPage.get(a.page) ?? [];
      list.push({
        number: a.number,
        text: a.text,
        numberInSurah: a.numberInSurah,
        surahName: `${a.surah.englishName} (${a.surah.name})`,
        surahNumber: a.surah.number,
      });
      byPage.set(a.page, list);
    }

    const pages: MushafPage[] = [...byPage.entries()]
      .sort((x, y) => x[0] - y[0])
      .map(([page, ayahs]) => ({ page, ayahs }));

    return { juz: data.juz, pages };
  });

