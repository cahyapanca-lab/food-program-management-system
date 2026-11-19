-- Jalankan di Supabase > SQL Editor. Aman dijalankan berulang (idempotent).
-- Tujuan: mencegah data aset ganda (nama + kota yang sama, tidak peduli huruf besar/kecil, spasi, tanda baca).

create or replace function norm_teks(t text) returns text
language sql immutable as $$ select regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', '', 'g') $$;

-- 1. Cek untuk relawan sebelum mengirim pengajuan (hanya mengembalikan 'aset' / 'menunggu' / kosong, tanpa data lain)
create or replace function cek_aset_ada(p_nama text, p_kota text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when norm_teks(p_nama) = '' then ''
    when exists (select 1 from aset where norm_teks(nama) = norm_teks(p_nama) and norm_teks(kota) = norm_teks(p_kota)) then 'aset'
    when exists (select 1 from pengajuan where status = 'baru' and norm_teks(nama_pondok) = norm_teks(p_nama) and norm_teks(kota) = norm_teks(p_kota)) then 'menunggu'
    else '' end
$$;
grant execute on function cek_aset_ada(text, text) to anon, authenticated;

-- 2. Gabungkan dua aset: aksi, to-do, dan pengajuan dipindah ke aset yang dipertahankan,
--    kolom kosong diisi dari aset yang digabung, foto dan dokumen digabung, lalu aset duplikat dihapus.
create or replace function gabung_aset(p_keep bigint, p_hapus bigint) returns void
language plpgsql security definer set search_path = public as $$
declare k aset; h aset;
begin
  if auth.role() <> 'authenticated' then raise exception 'tidak diizinkan'; end if;
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

-- 3. Pengunci di database (dibuat hanya bila belum ada data ganda)
do $$
begin
  if exists (select 1 from aset where norm_teks(nama) <> '' group by norm_teks(nama), norm_teks(kota) having count(*) > 1) then
    null; -- masih ada aset ganda: gabungkan dulu lewat Data Aset > Cek duplikat, lalu jalankan file ini lagi
  else
    create unique index if not exists aset_unik_nama_kota on aset (norm_teks(nama), norm_teks(kota)) where norm_teks(nama) <> '';
  end if;
  if not exists (select 1 from pengajuan where status = 'baru' and norm_teks(nama_pondok) <> '' group by norm_teks(nama_pondok), norm_teks(kota) having count(*) > 1) then
    create unique index if not exists pengajuan_unik_menunggu on pengajuan (norm_teks(nama_pondok), norm_teks(kota)) where status = 'baru' and norm_teks(nama_pondok) <> '';
  end if;
end $$;

-- Hasil (lihat tabel hasil di bawah):
select case when exists (select 1 from pg_indexes where indexname = 'aset_unik_nama_kota')
  then 'AKTIF: aset ganda tidak bisa lagi disimpan'
  else 'BELUM AKTIF: masih ada aset ganda. Gabungkan lewat Data Aset > Cek duplikat, lalu jalankan file ini lagi' end as status;
