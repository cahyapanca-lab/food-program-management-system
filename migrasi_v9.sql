-- =====================================================================
-- migrasi_v9.sql - DASHBOARD LEADERS: hanya LIHAT dan KOMENTAR
-- Jalankan SEKALI di Supabase > SQL Editor (aman diulang). Prasyarat: migrasi_v6.sql sudah dijalankan.
-- Menggantikan cara migrasi_v8 (role di metadata akun). migrasi_v8 tidak perlu dijalankan lagi.
--
-- Cara kerja:
--  * Daftar leaders disimpan di tabel `leaders` (berdasarkan email login). Akun yang TIDAK ada di daftar = admin.
--  * Policy "tutup_leader" (RESTRICTIVE) ditambahkan ke semua tabel admin dan penyimpanan file:
--    leaders tidak bisa membaca/mengubah tabel mentah. Policy admin yang sudah ada TIDAK diubah/dihapus.
--  * Leaders hanya membaca ringkasan lewat fungsi data_leader() dan menulis komentar di tabel komentar_leader.
--
-- Setelah menjalankan file ini, buat akun login leaders (sekali saja):
--   Authentication > Users > Add user > isi email + kata sandi, centang Auto Confirm User
--   untuk: manaf@sekolahrelawan.org, rani@sekolahrelawan.org, umar@sekolahrelawan.org
-- Menambah leaders baru nanti:
--   insert into leaders (email, nama) values ('email@baru.org', 'Nama');   lalu buat akunnya di Authentication.
-- Mencabut akses:  delete from leaders where email = 'email@contoh.org';
-- =====================================================================

-- 1. Daftar leaders (tidak bisa dibaca lewat API, hanya lewat fungsi di bawah)
create table if not exists leaders (
  email text primary key check (email = lower(email)),
  nama text not null,
  dibuat_pada timestamptz not null default now()
);
alter table leaders enable row level security;
revoke all on leaders from anon, authenticated;
insert into leaders (email, nama) values
  ('manaf@sekolahrelawan.org', 'Manaf'),
  ('rani@sekolahrelawan.org', 'Rani'),
  ('umar@sekolahrelawan.org', 'Umar')
on conflict (email) do update set nama = excluded.nama;

-- 2. Fungsi pengenal peran (memakai email di token login)
create or replace function is_leader() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.leaders where email = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
revoke all on function is_leader() from public, anon;
grant execute on function is_leader() to authenticated;

create or replace function profil_leader() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('leader', true, 'nama', l.nama, 'email', l.email)
       from public.leaders l where l.email = lower(coalesce(auth.jwt() ->> 'email', ''))),
    jsonb_build_object('leader', false))
$$;
revoke all on function profil_leader() from public, anon;
grant execute on function profil_leader() to authenticated;

create or replace function is_admin() returns boolean language sql stable as $$
  select auth.uid() is not null and not public.is_leader()
$$;

-- 3. Kunci akses leaders ke semua tabel admin (policy tambahan; policy admin lama tetap)
do $$
declare t text;
begin
  foreach t in array array['aset','pengajuan','jadwal_aksi','tugas','kolaborasi','penggunaan_dana','alat','opname'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists tutup_leader on public.%I', t);
      execute format('create policy tutup_leader on public.%I as restrictive for all to authenticated using (not public.is_leader()) with check (not public.is_leader())', t);
    end if;
  end loop;
end $$;

-- Penyimpanan file (foto dan dokumen santri): leaders tidak boleh membuka/mengubah lewat API
drop policy if exists tutup_leader_storage on storage.objects;
create policy tutup_leader_storage on storage.objects as restrictive for all to authenticated
  using (not public.is_leader()) with check (not public.is_leader());

-- Fungsi admin: leaders tidak boleh memakainya
create or replace function setujui_pengajuan(p_id bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare p pengajuan; new_id bigint;
begin
  if not is_admin() then raise exception 'tidak diizinkan'; end if;
  select * into p from pengajuan where id = p_id and status = 'baru';
  if not found then raise exception 'pengajuan tidak ditemukan atau sudah diproses'; end if;
  insert into aset (kota, cluster, nama, alamat, pimpinan, jumlah_pm, kg_beras_per_hari, pic, no_hp,
                    program, tahun_aset, status, lokasi_maps, latitude, longitude, story, keterangan,
                    foto_urls, rekomendasi, dokumen_santri, dari_pengajuan)
  values (p.kota, p.jenis, p.nama_pondok, p.alamat_pondok, p.pimpinan, p.jumlah_penghuni, p.konsumsi_beras_kg,
          p.nama_pengaju, p.no_telp, p.program, extract(year from now())::int, 'terbaru',
          p.lokasi_maps, p.latitude, p.longitude, p.story, p.kategori, p.foto_urls, p.rekomendasi, p.dokumen_santri, true)
  returning id into new_id;
  update pengajuan set status = 'disetujui', aset_id = new_id where id = p_id;
  return new_id;
end $$;
revoke all on function setujui_pengajuan(bigint) from public, anon;
grant execute on function setujui_pengajuan(bigint) to authenticated;

create or replace function gabung_aset(p_keep bigint, p_hapus bigint) returns void
language plpgsql security definer set search_path = public as $$
declare k aset; h aset;
begin
  if not is_admin() then raise exception 'tidak diizinkan'; end if;
  if p_keep = p_hapus then raise exception 'data yang digabung harus berbeda'; end if;
  select * into k from aset where id = p_keep;
  select * into h from aset where id = p_hapus;
  if k.id is null or h.id is null then raise exception 'aset tidak ditemukan'; end if;
  update jadwal_aksi set aset_id = p_keep where aset_id = p_hapus;
  update tugas set aset_id = p_keep where aset_id = p_hapus;
  update pengajuan set aset_id = p_keep where aset_id = p_hapus;
  update aset set
    kota = coalesce(k.kota, h.kota), cluster = coalesce(k.cluster, h.cluster), alamat = coalesce(k.alamat, h.alamat),
    pimpinan = coalesce(k.pimpinan, h.pimpinan), jumlah_pm = coalesce(k.jumlah_pm, h.jumlah_pm),
    kg_beras_per_hari = coalesce(k.kg_beras_per_hari, h.kg_beras_per_hari), pic = coalesce(k.pic, h.pic),
    no_hp = coalesce(k.no_hp, h.no_hp), program = coalesce(k.program, h.program), lokasi_maps = coalesce(k.lokasi_maps, h.lokasi_maps),
    latitude = case when k.latitude is null then h.latitude else k.latitude end,
    longitude = case when k.latitude is null then h.longitude else k.longitude end,
    story = coalesce(k.story, h.story), keterangan = coalesce(k.keterangan, h.keterangan), rekomendasi = coalesce(k.rekomendasi, h.rekomendasi),
    foto_urls = (select coalesce(array_agg(distinct u), '{}') from unnest(k.foto_urls || h.foto_urls) u),
    dokumen_santri = k.dokumen_santri || h.dokumen_santri,
    tahun_aset = least(k.tahun_aset, h.tahun_aset), tahun_pembaruan = greatest(k.tahun_pembaruan, h.tahun_pembaruan),
    sudah_implementasi = k.sudah_implementasi or h.sudah_implementasi,
    implementasi_terakhir = greatest(k.implementasi_terakhir, h.implementasi_terakhir)
  where id = p_keep;
  delete from aset where id = p_hapus;
end $$;
revoke all on function gabung_aset(bigint, bigint) from public, anon;
grant execute on function gabung_aset(bigint, bigint) to authenticated;

-- Ringkasan untuk dashboard leaders (hanya angka dan daftar singkat; tanpa nomor telepon, alamat, atau dokumen santri)
create or replace function data_leader(p_mulai date, p_akhir date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare hasil jsonb; hari date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if auth.uid() is null then raise exception 'tidak diizinkan'; end if;
  select jsonb_build_object(
    'aset', (select jsonb_build_object('total', count(*), 'pm', coalesce(sum(jumlah_pm), 0),
        'implementasi', count(*) filter (where sudah_implementasi),
        'ffc', count(*) filter (where program = 'FFC'), 'buyd', count(*) filter (where program = 'BUYD'),
        'baru', count(*) filter (where dari_pengajuan and (dibuat_pada at time zone 'Asia/Jakarta')::date between p_mulai and p_akhir)) from aset),
    'aksi', (select jsonb_build_object('total', count(*),
        'terlaksana', count(*) filter (where status_aksi = 'terlaksana'),
        'terjadwal', count(*) filter (where status_aksi = 'terjadwal'),
        'terkendala', count(*) filter (where status_aksi in ('terlambat', 'ditunda', 'dibatalkan', 'bermasalah')),
        'ffc', count(*) filter (where program = 'FFC'), 'buyd', count(*) filter (where program = 'BUYD'),
        'porsi', coalesce(sum(jumlah_bantuan) filter (where satuan ~* 'porsi'), 0),
        'kg', coalesce(sum(jumlah_bantuan) filter (where satuan ~* 'kg'), 0),
        'pm', coalesce(sum(jumlah_pm), 0)) from jadwal_aksi where tanggal between p_mulai and p_akhir),
    'per_kota', coalesce((select jsonb_agg(jsonb_build_array(k, n) order by n desc) from (
        select coalesce(nullif(kota, ''), '-') k, count(*) n from jadwal_aksi where tanggal between p_mulai and p_akhir group by 1 order by 2 desc limit 8) x), '[]'),
    'per_tanggal', coalesce((select jsonb_agg(jsonb_build_array(tanggal, n) order by tanggal) from (
        select tanggal, count(*) n from jadwal_aksi where tanggal between p_mulai and p_akhir group by 1) x), '[]'),
    'kendala', coalesce((select jsonb_agg(jsonb_build_object('tanggal', tanggal, 'lokasi', lokasi, 'kota', kota, 'status', status_aksi,
        'kategori', kendala_kategori, 'alasan', kendala_alasan) order by tanggal desc) from (
        select * from jadwal_aksi where tanggal between p_mulai and p_akhir
          and (status_aksi in ('terlambat', 'ditunda', 'dibatalkan', 'bermasalah') or (status_aksi = 'terjadwal' and tanggal < hari))
        order by tanggal desc limit 10) x), '[]'),
    'mitra', (select jsonb_build_object('jumlah', count(*), 'unik', count(distinct lower(trim(mitra))), 'nilai', coalesce(sum(nilai), 0))
        from kolaborasi where tanggal between p_mulai and p_akhir),
    'mitra_daftar', coalesce((select jsonb_agg(jsonb_build_object('mitra', mitra, 'jenis', jenis, 'nilai', nilai) order by tanggal desc) from (
        select * from kolaborasi where tanggal between p_mulai and p_akhir order by tanggal desc limit 6) x), '[]'),
    'dana', (select jsonb_build_object('total', coalesce(sum(jumlah), 0), 'transaksi', count(*)) from penggunaan_dana where tanggal between p_mulai and p_akhir),
    'dana_kategori', coalesce((select jsonb_agg(jsonb_build_array(k, n) order by n desc) from (
        select coalesce(nullif(kategori, ''), 'Lainnya') k, sum(jumlah) n from penggunaan_dana where tanggal between p_mulai and p_akhir group by 1 order by 2 desc limit 6) x), '[]'),
    'alat', (select jsonb_build_object('total', count(*), 'belum_dicek', count(*) filter (where o.id is null),
        'perhatian', count(*) filter (where o.id is not null and (o.jumlah_rusak + o.jumlah_hilang > 0 or (a.jumlah_standar is not null and o.jumlah_baik < a.jumlah_standar))))
        from alat a left join lateral (select * from opname where alat_id = a.id order by tanggal desc, id desc limit 1) o on true),
    'alat_perhatian', coalesce((select jsonb_agg(jsonb_build_object('nama', a.nama, 'baik', o.jumlah_baik, 'rusak', o.jumlah_rusak, 'hilang', o.jumlah_hilang, 'standar', a.jumlah_standar))
        from alat a join lateral (select * from opname where alat_id = a.id order by tanggal desc, id desc limit 1) o on true
        where o.jumlah_rusak + o.jumlah_hilang > 0 or (a.jumlah_standar is not null and o.jumlah_baik < a.jumlah_standar)), '[]'),
    'tugas', (select jsonb_build_object('todo', count(*) filter (where status = 'todo'), 'proses', count(*) filter (where status = 'proses'),
        'menunggu', count(*) filter (where status = 'menunggu'),
        'selesai', count(*) filter (where status = 'selesai' and (selesai_pada at time zone 'Asia/Jakarta')::date between p_mulai and p_akhir),
        'terlambat', count(*) filter (where status <> 'selesai' and tenggat < hari)) from tugas),
    'tugas_terlambat', coalesce((select jsonb_agg(jsonb_build_object('judul', judul, 'pj', penanggung_jawab, 'tenggat', tenggat) order by tenggat) from (
        select * from tugas where status <> 'selesai' and tenggat < hari order by tenggat limit 5) x), '[]'),
    'titik', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'lat', latitude, 'lng', longitude, 'nama', nama, 'program', program, 'kota', kota, 'pm', jumlah_pm))
        from aset where latitude is not null and longitude is not null), '[]')
  ) into hasil;
  return hasil;
end $$;
revoke all on function data_leader(date, date) from public, anon;
grant execute on function data_leader(date, date) to authenticated;

-- 4. Komentar leaders (leaders menulis, admin membaca dan membalas)
create table if not exists komentar_leader (
  id bigint generated always as identity primary key,
  leader_email text not null,
  leader_nama text not null,
  bagian text not null default 'Umum',
  periode text,
  isi text not null check (char_length(btrim(isi)) between 1 and 2000),
  status text not null default 'baru' check (status in ('baru','dibaca','ditanggapi')),
  balasan text check (char_length(balasan) <= 2000),
  dibalas_pada timestamptz,
  dibuat_pada timestamptz not null default now()
);

-- nama/email penulis diisi server dari login (tidak bisa dipalsukan), status awal selalu 'baru'
create or replace function komentar_leader_isi() returns trigger
language plpgsql security definer set search_path = public as $$
declare l leaders;
begin
  select * into l from public.leaders where email = lower(coalesce(auth.jwt() ->> 'email', ''));
  if l.email is null then raise exception 'hanya leaders yang boleh menulis komentar'; end if;
  new.leader_email := l.email; new.leader_nama := l.nama;
  new.status := 'baru'; new.balasan := null; new.dibalas_pada := null;
  return new;
end $$;
drop trigger if exists trg_komentar_leader_isi on komentar_leader;
create trigger trg_komentar_leader_isi before insert on komentar_leader
  for each row execute function komentar_leader_isi();

alter table komentar_leader enable row level security;
revoke all on komentar_leader from anon;
grant select, insert, update, delete on komentar_leader to authenticated;
drop policy if exists kl_baca on komentar_leader;
create policy kl_baca on komentar_leader for select to authenticated using (true);
drop policy if exists kl_tulis on komentar_leader;
create policy kl_tulis on komentar_leader for insert to authenticated with check (public.is_leader());
drop policy if exists kl_balas on komentar_leader;
create policy kl_balas on komentar_leader for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists kl_hapus on komentar_leader;
create policy kl_hapus on komentar_leader for delete to authenticated using (public.is_admin());

do $$ begin
  alter publication supabase_realtime add table komentar_leader;
exception when duplicate_object or undefined_object then null;
end $$;

-- 5. HASIL: leaders terdaftar, tabel terkunci, akun login yang sudah dibuat, dan jumlah data (harus > 0)
select
  (select string_agg(email, ', ' order by email) from leaders) as leaders_terdaftar,
  (select count(*) from pg_policies where policyname = 'tutup_leader') as tabel_terkunci,
  (select string_agg(u.email, ', ') from auth.users u join leaders l on l.email = lower(u.email)) as akun_login_sudah_dibuat,
  (select count(*) from aset) as aset,
  (select count(*) from jadwal_aksi) as jadwal_aksi;
