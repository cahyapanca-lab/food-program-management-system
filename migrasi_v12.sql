-- =====================================================================
-- migrasi_v12.sql - DETAIL ASET SESUAI FORM PENGAJUAN
-- Jalankan SEKALI di Supabase > SQL Editor (aman diulang). Tidak menghapus data.
-- Menambah data pengaju pada aset (organisasi, alamat pengaju) agar detail aset
-- selengkap form pengajuan, dan ikut tersalin saat pengajuan disetujui.
-- =====================================================================
alter table aset add column if not exists organisasi text check (char_length(organisasi) <= 150);
alter table aset add column if not exists alamat_pengaju text check (char_length(alamat_pengaju) <= 400);

create or replace function setujui_pengajuan(p_id bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare p pengajuan; new_id bigint;
begin
  if not is_admin() then raise exception 'tidak diizinkan'; end if;
  select * into p from pengajuan where id = p_id and status = 'baru';
  if not found then raise exception 'pengajuan tidak ditemukan atau sudah diproses'; end if;
  insert into aset (kota, cluster, nama, alamat, pimpinan, jumlah_pm, kg_beras_per_hari, pic, no_hp, organisasi, alamat_pengaju,
                    program, tahun_aset, status, lokasi_maps, latitude, longitude, story, keterangan,
                    foto_urls, rekomendasi, dokumen_santri, dari_pengajuan)
  values (p.kota, p.jenis, p.nama_pondok, p.alamat_pondok, p.pimpinan, p.jumlah_penghuni, p.konsumsi_beras_kg,
          p.nama_pengaju, p.no_telp, p.organisasi, p.alamat_pengaju, p.program, extract(year from now())::int, 'terbaru',
          p.lokasi_maps, p.latitude, p.longitude, p.story, p.kategori, p.foto_urls, p.rekomendasi, p.dokumen_santri, true)
  returning id into new_id;
  update pengajuan set status = 'disetujui', aset_id = new_id where id = p_id;
  return new_id;
end $$;
revoke all on function setujui_pengajuan(bigint) from public, anon;
grant execute on function setujui_pengajuan(bigint) to authenticated;

-- Aset yang sebelumnya sudah disetujui dari pengajuan: isi data pengajunya
update aset a set organisasi = coalesce(a.organisasi, p.organisasi), alamat_pengaju = coalesce(a.alamat_pengaju, p.alamat_pengaju)
from pengajuan p where p.aset_id = a.id and (a.organisasi is null or a.alamat_pengaju is null);

-- HASIL: kolom_ada harus 2
select (select count(*) from information_schema.columns where table_name = 'aset' and column_name in ('organisasi', 'alamat_pengaju')) as kolom_ada,
       (select count(*) from aset where organisasi is not null or alamat_pengaju is not null) as aset_terisi;
