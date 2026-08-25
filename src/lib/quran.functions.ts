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
