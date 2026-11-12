-- Jalankan HANYA jika kamu sudah menjalankan schema.sql versi sebelumnya (tabel sudah ada).
-- Kalau menjalankan schema.sql versi terbaru dari awal, abaikan file ini.
alter table aset add column if not exists titik_perkiraan boolean not null default false;
alter table jadwal_aksi
  add column if not exists lokasi_maps text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists titik_perkiraan boolean not null default false;

revoke select on jadwal_aksi from anon;
grant select (id, tanggal, program, kota, lokasi, jumlah_bantuan, satuan, jumlah_pm, segmentasi, selesai, publik, latitude, longitude)
  on jadwal_aksi to anon;
