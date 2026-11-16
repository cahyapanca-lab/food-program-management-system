-- Jalankan HANYA jika database sudah dibuat dengan schema.sql versi sebelumnya.
-- Kalau menjalankan schema.sql terbaru dari awal, abaikan file ini.
-- Syarat: migrasi_v4.sql (kolom status_aksi pada jadwal_aksi) sudah dijalankan.

-- 3b. TO-DO (papan ala Trello, hanya admin)
create table tugas (
  id bigint generated always as identity primary key,
  judul text not null check (char_length(judul) <= 200),
  deskripsi text,
  status text not null default 'todo' check (status in ('todo','proses','menunggu','selesai')),
  prioritas text not null default 'sedang' check (prioritas in ('rendah','sedang','tinggi')),
  tenggat date,
  penanggung_jawab text,
  aset_id bigint references aset(id) on delete set null,
  jadwal_id bigint references jadwal_aksi(id) on delete set null,
  tampil_di_jadwal boolean not null default false,
  urutan double precision not null default 0,
  selesai_pada timestamptz,
  dibuat_pada timestamptz not null default now()
);

alter table tugas enable row level security;
create policy admin_tugas on tugas for all to authenticated using (true) with check (true);
alter publication supabase_realtime add table tugas;

-- 5b. RINGKASAN ANGKA UNTUK HALAMAN AWAL (hanya agregat; tidak membuka data detail ke publik)
create or replace function statistik_publik() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_aset', (select count(*) from aset),
    'penerima_manfaat', (select coalesce(sum(jumlah_pm), 0) from aset),
    'aset_baru', (select count(*) from aset where tahun_aset = extract(year from (now() at time zone 'Asia/Jakarta'))::int or dari_pengajuan),
    'aset_implementasi', (select count(*) from aset where sudah_implementasi),
    'aksi_bulan_ini', (select count(*) from jadwal_aksi
        where date_trunc('month', tanggal) = date_trunc('month', (now() at time zone 'Asia/Jakarta')::date)),
    'aksi_terlaksana', (select count(*) from jadwal_aksi
        where status_aksi = 'terlaksana'
          and date_trunc('month', tanggal) = date_trunc('month', (now() at time zone 'Asia/Jakarta')::date))
  );
$$;
grant execute on function statistik_publik() to anon, authenticated;

