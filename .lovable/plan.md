# Aplikasi Khatam Qur'an Tim Kerohanian

Aplikasi internal untuk karyawan: login dengan NIK, ambil 1 Juz otomatis sesuai urutan, baca teks Qur'an di dalam aplikasi, lalu tandai selesai.

## Alur pengguna

1. **Login** — karyawan masuk dengan NIK + password (bisa daftar sendiri: NIK, nama, password).
2. **Beranda / Ambil Juz** — jika belum punya Juz aktif, ada tombol "Ambil Juz". Sistem memberi Juz kosong dengan nomor terkecil pada putaran khatam yang sedang berjalan. Satu orang = satu Juz aktif.
3. **Mulai** — tombol "Mulai" membuka halaman baca: teks Arab Juz tersebut, dimuat dari API Qur'an gratis (Al Quran Cloud), per halaman/ayat dengan navigasi. Waktu mulai dicatat.
4. **Selesai** — tombol "Selesai" menandai Juz sebagai khatam, mencatat waktu selesai, dan mengembalikan user ke beranda dengan status "Alhamdulillah, Juz X selesai".
5. **Putaran berulang** — saat seluruh 30 Juz pada satu putaran sudah diambil, sistem otomatis membuka putaran (khatam) berikutnya, sehingga user yang baru login tetap kebagian Juz mulai dari 1 lagi. Jadi jumlah putaran mengikuti jumlah user yang ikut.
6. **Papan progres** — daftar 30 Juz putaran berjalan dengan status (kosong / sedang dibaca oleh siapa / selesai), plus jumlah khatam yang sudah tercapai.

## Yang perlu diaktifkan

Lovable Cloud (database + login) untuk menyimpan user, putaran khatam, dan pembagian Juz. Login NIK memakai alamat email internal turunan dari NIK (mis. `12345@khatam.local`) sehingga NIK berfungsi sebagai kredensial; konsekuensinya reset password lewat email tidak tersedia — reset dilakukan oleh admin.

## Detail teknis

**Tabel**
- `profiles` — `id` (ref auth.users), `nik` (unik), `nama`. Dibuat otomatis lewat trigger saat signup.
- `khatam_rounds` — `id`, `nomor_putaran`, `status` (aktif/selesai), `created_at`.
- `juz_assignments` — `id`, `round_id`, `juz_number` (1..30), `user_id`, `status` (diambil/dibaca/selesai), `started_at`, `finished_at`. Unik pada (`round_id`, `juz_number`).
- Semua tabel: GRANT untuk `authenticated` + `service_role`, RLS aktif; baca untuk semua user login (papan progres), tulis hanya baris milik sendiri.

**Server functions** (`createServerFn` + `requireSupabaseAuth`)
- `claimJuz` — transaksi lewat fungsi Postgres `claim_next_juz()` (SECURITY DEFINER, `FOR UPDATE`) supaya dua user tidak dapat Juz sama; membuat putaran baru bila 30 Juz sudah habis.
- `startReading` / `finishJuz` — update status + timestamp milik user.
- `getBoard` — daftar assignment putaran aktif.

**Teks Qur'an** — diambil server-side dari `https://api.alquran.cloud/v1/juz/{n}/quran-uthmani` lalu di-cache oleh TanStack Query; ditampilkan per ayat dengan nama surah.

**Rute**
- `/` — landing + form login/daftar (publik).
- `/_authenticated/dashboard` — status Juz saya + tombol Ambil/Mulai/Selesai + papan progres.
- `/_authenticated/baca/$juz` — tampilan baca dengan tombol Selesai.

**Desain** — nuansa hijau zamrud/emas lembut, tipografi Arab yang lapang dan mudah dibaca, tanpa gradasi ungu generik.
