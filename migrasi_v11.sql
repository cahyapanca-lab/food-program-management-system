-- =====================================================================
-- migrasi_v11.sql - LINK DOKUMENTASI ASET
-- Jalankan SEKALI di Supabase > SQL Editor (aman diulang). Tidak menghapus atau mengubah data.
-- Menambah kolom aset.link_dokumentasi (mis. folder Google Drive) dan menyertakannya
-- pada fungsi baca-saja untuk dashboard leaders (leader_aset).
-- =====================================================================
alter table aset add column if not exists link_dokumentasi text;
alter table aset drop constraint if exists aset_link_dokumentasi_cek;
alter table aset add constraint aset_link_dokumentasi_cek
  check (link_dokumentasi is null or (char_length(link_dokumentasi) <= 1000 and link_dokumentasi ~* '^https?://'));

create or replace function leader_aset() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'tidak diizinkan'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.nama, x.id) from (
    select id, nama, kota, cluster, program, jumlah_pm, kg_beras_per_hari, pimpinan, pic, alamat,
           tahun_aset, tahun_pembaruan, status, sudah_implementasi, implementasi_terakhir, dari_pengajuan,
           lokasi_maps, latitude, longitude, titik_perkiraan, keterangan, story, rekomendasi, foto_urls, link_dokumentasi, dibuat_pada
    from aset order by nama, id limit 3000) x), '[]'::jsonb);
end $$;

revoke all on function leader_aset() from public, anon;
grant execute on function leader_aset() to authenticated;

-- HASIL: kolom_ada harus 1; aset_punya_link = jumlah aset yang sudah diisi linknya
select (select count(*) from information_schema.columns where table_name = 'aset' and column_name = 'link_dokumentasi') as kolom_ada,
       (select count(*) from aset where link_dokumentasi is not null) as aset_punya_link,
       (select count(*) from aset) as total_aset;
