-- =====================================================================
-- migrasi_v10.sql - Dashboard Leaders: JADWAL AKSI, DATA ASET, dan PENGAJUAN (hanya lihat)
-- Jalankan SEKALI di Supabase > SQL Editor (aman diulang). Prasyarat: migrasi_v9.sql sudah dijalankan.
--
-- Leaders TETAP tidak bisa membaca atau mengubah tabel mentah (policy tutup_leader dari v9 tidak diubah).
-- Mereka hanya mendapat 3 fungsi baca-saja di bawah ini. Kolom sensitif sengaja TIDAK disertakan:
--   aset      : no_hp (nomor telepon PIC), dokumen_santri (dokumen privat)
--   pengajuan : no_telp, alamat_pengaju, dokumen_santri
-- =====================================================================

create or replace function leader_aset() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'tidak diizinkan'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.nama, x.id) from (
    select id, nama, kota, cluster, program, jumlah_pm, kg_beras_per_hari, pimpinan, pic, alamat,
           tahun_aset, tahun_pembaruan, status, sudah_implementasi, implementasi_terakhir, dari_pengajuan,
           lokasi_maps, latitude, longitude, titik_perkiraan, keterangan, story, rekomendasi, foto_urls, dibuat_pada
    from aset order by nama, id limit 3000) x), '[]'::jsonb);
end $$;

create or replace function leader_jadwal() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'tidak diizinkan'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.tanggal, x.id) from (
    select id, tanggal, program, kota, lokasi, sumber_dana, pelaksana, jejaring, jumlah_bantuan, satuan, jumlah_pm,
           segmentasi, armada, pic_driver, keterangan, selesai, status_aksi, kendala_kategori, kendala_alasan,
           relawan, latitude, longitude, aset_id
    from jadwal_aksi order by tanggal desc, id desc limit 3000) x), '[]'::jsonb);
end $$;

create or replace function leader_pengajuan() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'tidak diizinkan'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.id desc) from (
    select id, program, nama_pondok, jenis, kota, alamat_pondok, jumlah_penghuni, pimpinan, konsumsi_beras_kg,
           kategori, story, rekomendasi, status, nama_pengaju, organisasi, lokasi_maps, latitude, longitude,
           foto_urls, aset_id, dibuat_pada
    from pengajuan order by id desc limit 3000) x), '[]'::jsonb);
end $$;

revoke all on function leader_aset() from public, anon;
revoke all on function leader_jadwal() from public, anon;
revoke all on function leader_pengajuan() from public, anon;
grant execute on function leader_aset() to authenticated;
grant execute on function leader_jadwal() to authenticated;
grant execute on function leader_pengajuan() to authenticated;

-- HASIL: harus 3 fungsi terpasang dan tabel mentah masih terkunci untuk leaders
select
  (select count(*) from pg_proc where proname in ('leader_aset', 'leader_jadwal', 'leader_pengajuan')) as fungsi_terpasang,
  (select count(*) from pg_policies where policyname = 'tutup_leader') as tabel_terkunci_untuk_leaders,
  (select count(*) from aset) as aset, (select count(*) from jadwal_aksi) as jadwal_aksi, (select count(*) from pengajuan) as pengajuan;
