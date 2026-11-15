-- Jalankan HANYA jika tabel jadwal_aksi sudah dibuat dengan schema.sql versi sebelumnya.
-- Kalau menjalankan schema.sql terbaru dari awal, abaikan file ini.
alter table jadwal_aksi
  add column if not exists status_aksi text not null default 'terjadwal',
  add column if not exists kendala_kategori text,
  add column if not exists kendala_alasan text,
  add column if not exists relawan text[] not null default '{}';

alter table jadwal_aksi drop constraint if exists jadwal_aksi_status_aksi_check;
alter table jadwal_aksi add constraint jadwal_aksi_status_aksi_check
  check (status_aksi in ('terjadwal','terlaksana','terlambat','ditunda','dibatalkan','bermasalah'));

-- jadwal yang sebelumnya sudah ditandai selesai menjadi Terlaksana
update jadwal_aksi set status_aksi = 'terlaksana' where selesai = true and status_aksi = 'terjadwal';

-- catatan: kolom baru ini (kendala dan nama relawan) sengaja TIDAK diberikan ke akun publik (anon),
-- sehingga halaman relawan tidak bisa melihatnya.
