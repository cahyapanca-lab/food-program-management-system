-- Dashboard Leaders: akun leaders hanya bisa MELIHAT ringkasan, tidak bisa mengubah atau membuka data detail.
-- Jalankan SEKALI di Supabase > SQL Editor. Prasyarat: migrasi_v6.sql sudah dijalankan.
--
-- Cara membuat akun leaders:
-- 1) Authentication > Users > Add user (email + kata sandi, Auto Confirm).
-- 2) Jalankan di SQL Editor (ganti emailnya):
--      update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"leader"}'::jsonb
--      where email in ('leader1@contoh.com', 'leader2@contoh.com');
-- 3) Leaders masuk lewat alamat /leaders (jika sudah telanjur login, keluar lalu masuk lagi).
-- Akun tanpa peran "leader" tetap menjadi admin seperti biasa.

create or replace function is_admin() returns boolean language sql stable as $$
  select auth.role() = 'authenticated' and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'admin') <> 'leader'
$$;

-- Semua akses tabel admin kini menolak akun leaders
drop policy if exists admin_aset on aset;
create policy admin_aset on aset for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_pengajuan on pengajuan;
create policy admin_pengajuan on pengajuan for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_jadwal on jadwal_aksi;
create policy admin_jadwal on jadwal_aksi for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_tugas on tugas;
create policy admin_tugas on tugas for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_kolaborasi on kolaborasi;
create policy admin_kolaborasi on kolaborasi for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_dana on penggunaan_dana;
create policy admin_dana on penggunaan_dana for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_alat on alat;
create policy admin_alat on alat for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists admin_opname on opname;
create policy admin_opname on opname for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists foto_admin on storage.objects;
create policy foto_admin on storage.objects for all to authenticated
  using (bucket_id = 'dokumentasi' and is_admin()) with check (bucket_id = 'dokumentasi' and is_admin());
drop policy if exists dokumen_admin on storage.objects;
create policy dokumen_admin on storage.objects for all to authenticated
  using (bucket_id = 'dokumen_santri' and is_admin()) with check (bucket_id = 'dokumen_santri' and is_admin());

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
  if auth.role() <> 'authenticated' then raise exception 'tidak diizinkan'; end if;
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
