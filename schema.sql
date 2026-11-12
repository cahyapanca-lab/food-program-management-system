-- =====================================================================
-- FPMS - Program Pangan Sekolah Relawan (BUYD & FFC)
-- Supabase: SQL Editor > New query > tempel semua > Run
-- Kalau sebelumnya pernah membuat tabel bernama sama (aset, pengajuan,
-- jadwal_aksi), hapus dulu dengan menjalankan 3 baris ini:
--   drop table if exists jadwal_aksi, pengajuan, aset cascade;
--   drop function if exists setujui_pengajuan(bigint);
-- =====================================================================

-- 1. DATA ASET (terverifikasi, hanya admin)
create table aset (
  id bigint generated always as identity primary key,
  kota text, cluster text, nama text not null, alamat text, pimpinan text,
  jumlah_pm int, kg_beras_per_hari numeric,
  pic text, no_hp text,
  program text check (program in ('FFC','BUYD')),
  tahun_aset int,
  status text check (status in ('terbaru','perlu_update')),
  lokasi_maps text, latitude double precision, longitude double precision,
  story text, keterangan text,
  foto_urls text[] not null default '{}',
  sudah_implementasi boolean not null default false,
  implementasi_terakhir date,
  dari_pengajuan boolean not null default false,
  dibuat_pada timestamptz not null default now()
);

-- 2. PENGAJUAN (diisi relawan lewat form)
create table pengajuan (
  id bigint generated always as identity primary key,
  program text not null check (program in ('FFC','BUYD')),
  nama_pengaju text not null check (char_length(nama_pengaju) <= 120),
  no_telp text not null check (char_length(no_telp) <= 20),
  organisasi text check (char_length(organisasi) <= 150),
  alamat_pengaju text check (char_length(alamat_pengaju) <= 400),
  nama_pondok text not null check (char_length(nama_pondok) <= 150),
  jenis text check (char_length(jenis) <= 60),
  kota text check (char_length(kota) <= 80),
  alamat_pondok text check (char_length(alamat_pondok) <= 500),
  jumlah_penghuni int check (jumlah_penghuni between 0 and 100000),
  pimpinan text check (char_length(pimpinan) <= 120),
  konsumsi_beras_kg numeric check (konsumsi_beras_kg between 0 and 10000),
  kategori text check (char_length(kategori) <= 200),
  story text check (char_length(story) <= 3000),
  foto_urls text[] not null default '{}' check (coalesce(array_length(foto_urls,1),0) <= 5),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  lokasi_maps text check (char_length(lokasi_maps) <= 500),
  website text check (coalesce(website,'') = ''),   -- jebakan bot
  status text not null default 'baru' check (status in ('baru','disetujui','ditolak')),
  aset_id bigint references aset(id) on delete set null,
  dibuat_pada timestamptz not null default now()
);

-- 3. JADWAL AKSI
create table jadwal_aksi (
  id bigint generated always as identity primary key,
  tanggal date not null,
  program text not null check (program in ('FFC','BUYD')),
  aset_id bigint references aset(id) on delete set null,
  kota text, lokasi text not null,
  sumber_dana text, pelaksana text, jejaring text,
  jumlah_bantuan numeric, satuan text,
  jumlah_pm int, segmentasi text,
  armada text, pic_driver text, keterangan text,
  selesai boolean not null default false,
  publik boolean not null default true
);

-- 4. KEAMANAN (RLS)
alter table aset enable row level security;
alter table pengajuan enable row level security;
alter table jadwal_aksi enable row level security;

-- admin = akun yang login (matikan "Allow new users to sign up" di Authentication)
create policy admin_aset on aset for all to authenticated using (true) with check (true);
create policy admin_pengajuan on pengajuan for all to authenticated using (true) with check (true);
create policy admin_jadwal on jadwal_aksi for all to authenticated using (true) with check (true);

-- relawan (tanpa login): hanya boleh KIRIM pengajuan dan LIHAT jadwal publik
create policy relawan_kirim on pengajuan for insert to anon
  with check (status = 'baru' and aset_id is null);
create policy relawan_lihat_jadwal on jadwal_aksi for select to anon using (publik = true);
revoke select on jadwal_aksi from anon;
grant select (id, tanggal, program, kota, lokasi, jumlah_bantuan, satuan, jumlah_pm, segmentasi, selesai, publik)
  on jadwal_aksi to anon;

-- 5. TOMBOL SETUJUI: pindahkan pengajuan menjadi aset baru
create or replace function setujui_pengajuan(p_id bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare p pengajuan; new_id bigint;
begin
  if auth.role() <> 'authenticated' then raise exception 'tidak diizinkan'; end if;
  select * into p from pengajuan where id = p_id and status = 'baru';
  if not found then raise exception 'pengajuan tidak ditemukan atau sudah diproses'; end if;
  insert into aset (kota, cluster, nama, alamat, pimpinan, jumlah_pm, kg_beras_per_hari, pic, no_hp,
                    program, tahun_aset, status, lokasi_maps, latitude, longitude, story, keterangan,
                    foto_urls, dari_pengajuan)
  values (p.kota, p.jenis, p.nama_pondok, p.alamat_pondok, p.pimpinan, p.jumlah_penghuni, p.konsumsi_beras_kg,
          p.nama_pengaju, p.no_telp, p.program, extract(year from now())::int, 'terbaru',
          p.lokasi_maps, p.latitude, p.longitude, p.story, p.kategori, p.foto_urls, true)
  returning id into new_id;
  update pengajuan set status = 'disetujui', aset_id = new_id where id = p_id;
  return new_id;
end $$;
revoke all on function setujui_pengajuan(bigint) from public, anon;
grant execute on function setujui_pengajuan(bigint) to authenticated;

-- 6. REALTIME: dashboard dan daftar ter-update otomatis
alter publication supabase_realtime add table aset, pengajuan, jadwal_aksi;

-- 7. PENYIMPANAN FOTO (bucket publik, maks 5 MB per foto, hanya gambar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumentasi', 'dokumentasi', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy foto_baca on storage.objects for select using (bucket_id = 'dokumentasi');
create policy foto_unggah_relawan on storage.objects for insert to anon
  with check (bucket_id = 'dokumentasi' and name like 'pengajuan/%');
create policy foto_admin on storage.objects for all to authenticated
  using (bucket_id = 'dokumentasi') with check (bucket_id = 'dokumentasi');

-- 8. SETELAH IMPOR CSV ASET, jalankan sekali agar aset impor tidak dihitung "baru" di laporan:
--   update aset set dibuat_pada = '2025-01-01';
