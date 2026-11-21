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

## Kendala, relawan, dan tangga juara
- Jadwal Aksi punya status pelaksanaan (Terjadwal, Terlaksana, Terlambat, Ditunda, Dibatalkan, Bermasalah), kategori kendala, dan alasan.
  Aksi yang sudah lewat tanggal tapi belum dilaporkan juga otomatis dianggap terkendala di rekap. Tampil di slide "Kendala & Bottleneck" PPT.
- Nama relawan diisi per aksi. Jumlah relawan tampil di PPT; menu Relawan berisi rekap dan alat merapikan ejaan nama.
- Tangga juara di dashboard dihitung per bulan dari aksi berstatus Terlaksana. Rekap bulanan PPT memuat slide apresiasi dengan ucapan.
- Excel lengkap (menu Laporan) memuat seluruh data aset, lama dan baru, dengan kolom "Sumber data".
- Sudah menjalankan schema.sql versi lama? Jalankan `migrasi_v4.sql` sekali.

## To-do, pengingat, dan notifikasi
- Menu To-do: papan ala Trello (Akan dikerjakan, Sedang dikerjakan, Menunggu, Selesai). Seret kartu antar kolom; di HP pakai tombol ‹ ›.
  To-do bisa dihubungkan ke aset dan jadwal aksi, dan bisa ditampilkan di kalender Jadwal Aksi (khusus admin). Rekap mingguan/bulanan memuat slide dan sheet To-do.
- Dashboard admin: kartu Pengingat (to-do terlambat/jatuh tempo, aksi hari ini sampai H-3, aksi lewat jadwal yang belum dilaporkan, pengajuan menunggu).
- Halaman awal dan halaman relawan: ikon lonceng di kanan atas berisi pengingat aksi 7 hari ke depan (klik item untuk melihat detail jadwal),
  dan langganan kalender `/jadwal.ics` untuk notifikasi otomatis di HP. Ringkasan angka (kartu) hanya ada di dashboard admin.
- Sudah menjalankan schema.sql versi lama? Jalankan `migrasi_v5.sql` sekali (setelah migrasi_v4.sql).

## Tampilan
- Semua halaman responsif (PC dan HP). Admin: ikon rumah = kembali ke halaman awal, lonceng = pengingat (to-do, aksi, pengajuan).
- Fungsi `statistik_publik` dari migrasi_v5.sql tidak dipakai lagi oleh halaman awal (aman dibiarkan).

## Hapus aset (v16)
- Admin › Data Aset: tombol **Hapus** di setiap baris dan **🗑 Hapus aset** di form edit. Ada konfirmasi yang menampilkan jumlah jadwal aksi, to-do, dan pengajuan yang terhubung (data itu tetap ada, hanya terlepas dari aset). Penghapusan permanen; foto dan dokumen di penyimpanan tidak ikut dihapus. Tidak perlu migrasi SQL.

## Dashboard Leaders (v9: hanya lihat + komentar)
- Alamat: `/leaders`. Tombol **Masuk leaders** ada di halaman awal, di samping **Masuk admin**.
- Leaders (manaf@, rani@, umar@sekolahrelawan.org) hanya bisa MELIHAT ringkasan (aset, aksi, kendala, to-do terlambat, stok alat, mitra, dana, peta) dan MENULIS KOMENTAR. Tidak ada tombol ubah/hapus, dan database menolak perubahan dari akun leaders.
- Tab di dashboard leaders (v10): **Ringkasan**, **Jadwal aksi** (kalender + detail), **Data aset** (cari, filter, tabel/peta, detail + foto), dan **Pengajuan** (menunggu/disetujui/ditolak). Semuanya hanya dilihat. Nomor telepon dan dokumen santri sengaja tidak ditampilkan. Jalankan `migrasi_v10.sql` sekali setelah `migrasi_v9.sql`.
- Admin membaca dan membalas komentar di menu **Komentar** (lencana jingga = komentar baru) atau lewat tombol di Dashboard admin.
- Pasang: jalankan `migrasi_v9.sql` sekali di Supabase (prasyarat: `migrasi_v6.sql`). `migrasi_v8.sql` tidak perlu lagi. Lalu buat akun login di Authentication > Users > Add user (Auto Confirm) untuk tiga email di atas.
- Peran ditentukan dari tabel `leaders` (berdasarkan email), bukan dari metadata akun. Akun yang tidak ada di tabel itu adalah admin.
- Tambah leaders: `insert into leaders (email, nama) values ('email@baru.org', 'Nama');` lalu buat akunnya di Authentication. Cabut akses: `delete from leaders where email = '...';`
