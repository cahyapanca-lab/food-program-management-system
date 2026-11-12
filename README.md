# FPMS - Program Pangan Sekolah Relawan (BUYD & FFC)

Next.js 15 + Supabase + Vercel. Tanpa TypeScript.

Halaman:
- `/relawan` (publik): form pengajuan BUYD/FFC (5 foto kamera + titik lokasi Google Maps) dan kalender jadwal aksi.
- `/admin` (login): Dashboard (infografis aset baru otomatis), `/admin/aset` (edit, cari, urutkan, chat WhatsApp PIC),
  `/admin/pengajuan` (setujui/tolak), `/admin/jadwal` (kalender + info per bulan).

## Pasang dari nol
1. Supabase: proyek baru > SQL Editor > jalankan `schema.sql`.
   Table Editor > `aset` > Insert > Import CSV > `data/aset_import.csv`, lalu jalankan sekali:
   `update aset set dibuat_pada = '2025-01-01';`
   Impor `data/jadwal_ffc_siap_upload.csv` dan `data/jadwal_buyd_siap_upload.csv` ke tabel `jadwal_aksi`.
   Authentication > Users > Add user (akun admin, Auto Confirm), lalu matikan "Allow new users to sign up".
   Project Settings > API: catat Project URL dan anon/publishable key.
2. GitHub: KOSONGKAN repo lama (hapus semua file, termasuk tsconfig.json dan next-env.d.ts) atau buat repo baru,
   lalu unggah seluruh isi folder ini.
3. Vercel: import repo > Environment Variables `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` > Deploy.
4. (Opsional) Salinan ke Google Sheet: ikuti petunjuk di `apps-script.gs`, isi `NEXT_PUBLIC_SHEETS_WEBHOOK` di Vercel, Redeploy.

## Google Maps
- Tanpa API key: tombol "Buka" ke Google Maps dan pratinjau peta per lokasi (di form edit aset, jadwal, dan detail jadwal) sudah berfungsi.
- Dengan API key: peta semua titik di Dashboard, tab Peta di Data Aset, dan peta lokasi aksi bulanan di Jadwal, plus tombol
  "Lengkapi titik lokasi otomatis" (hasilnya perkiraan, periksa lagi).
  Cara: console.cloud.google.com > buat proyek > aktifkan billing (ada kuota gratis bulanan) > APIs & Services > Library >
  aktifkan "Maps JavaScript API" dan "Geocoding API" > Credentials > Create credentials > API key.
  Batasi key: Application restrictions = Websites, isi alamat Vercel-mu (contoh https://nama-proyek.vercel.app/*);
  API restrictions = dua API di atas. Isi ke Vercel sebagai NEXT_PUBLIC_GOOGLE_MAPS_KEY, lalu Redeploy.
- Sudah menjalankan schema.sql versi lama? Jalankan `migrasi_peta.sql` sekali.
