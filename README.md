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

## Peta
- Peta banyak titik memakai Leaflet + OpenStreetMap: gratis, tanpa API key, tanpa akun penagihan.
- Tombol "Buka" ke Google Maps dan pratinjau peta per lokasi memakai tautan/embed Google Maps biasa (gratis, tanpa key).
- Titik lokasi: dari GPS (tombol "Ambil titik lokasi saya"), dari link Google Maps panjang yang ditempel, atau otomatis lewat
  tombol "Lengkapi titik lokasi otomatis" (OpenStreetMap Nominatim, perkiraan, sekitar 1 permintaan per detik).
- Sudah menjalankan schema.sql versi lama? Jalankan `migrasi_peta.sql` sekali.

## Fitur unduhan dan rekap
- Form relawan: keterangan opsional (rekomendasi Ramadhan dll), minimal 5 foto (maks. 10), dan data santri (PDF/Word/gambar, privat).
- Admin > Data Aset dan Pengajuan: unduh Excel, profil Word, atau paket ZIP (Word + foto + dokumen santri) untuk diunggah manual ke Google Drive.
- Admin > Laporan: unduh rekap aksi mingguan atau bulanan sebagai PowerPoint yang bisa diedit (dengan grafik bawaan PowerPoint) dan Excel.
- Pustaka Excel/Word/ZIP/PPT dimuat dari CDN jsDelivr saat tombol ditekan, jadi perangkat admin perlu terhubung ke internet.
- Sudah menjalankan schema.sql versi lama? Jalankan `migrasi_v3.sql` sekali.
