-- Jalankan SEKALI di Supabase > SQL Editor. Hanya admin (login) yang bisa membaca/menulis tabel baru ini.
alter table aset add column if not exists tahun_pembaruan int check (tahun_pembaruan between 2000 and 2100);
-- catatan: kolom lama tahun_aset kini berarti "tahun perolehan aset" (tahun aset didapatkan)

create table if not exists kolaborasi (
  id bigint generated always as identity primary key,
  tanggal date not null,
  mitra text not null check (char_length(mitra) <= 200),
  jenis text, program text, nilai numeric check (nilai >= 0), deskripsi text,
  dibuat_pada timestamptz not null default now()
);
create table if not exists penggunaan_dana (
  id bigint generated always as identity primary key,
  tanggal date not null,
  sumber text, kategori text, program text,
  jumlah numeric not null check (jumlah >= 0),
  uraian text not null check (char_length(uraian) <= 500),
  dibuat_pada timestamptz not null default now()
);
create table if not exists alat (
  id bigint generated always as identity primary key,
  nama text not null check (char_length(nama) <= 200),
  kategori text, satuan text default 'unit', lokasi text,
  jumlah_standar int check (jumlah_standar >= 0), catatan text,
  dibuat_pada timestamptz not null default now()
);
create table if not exists opname (
  id bigint generated always as identity primary key,
  alat_id bigint not null references alat(id) on delete cascade,
  tanggal date not null default current_date,
  periode text not null default 'harian' check (periode in ('harian','mingguan','bulanan')),
  jumlah_baik int not null default 0 check (jumlah_baik >= 0),
  jumlah_rusak int not null default 0 check (jumlah_rusak >= 0),
  jumlah_hilang int not null default 0 check (jumlah_hilang >= 0),
  petugas text, catatan text,
  dibuat_pada timestamptz not null default now()
);

alter table kolaborasi enable row level security;
alter table penggunaan_dana enable row level security;
alter table alat enable row level security;
alter table opname enable row level security;
create policy admin_kolaborasi on kolaborasi for all to authenticated using (true) with check (true);
create policy admin_dana on penggunaan_dana for all to authenticated using (true) with check (true);
create policy admin_alat on alat for all to authenticated using (true) with check (true);
create policy admin_opname on opname for all to authenticated using (true) with check (true);
alter publication supabase_realtime add table kolaborasi, penggunaan_dana, alat, opname;
