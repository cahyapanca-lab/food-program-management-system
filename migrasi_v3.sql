-- Jalankan HANYA jika tabel sudah dibuat dengan schema.sql versi sebelumnya.
-- Kalau menjalankan schema.sql terbaru dari awal, abaikan file ini.
alter table aset
  add column if not exists rekomendasi text,
  add column if not exists dokumen_santri jsonb not null default '[]'::jsonb;
alter table pengajuan
  add column if not exists rekomendasi text,
  add column if not exists dokumen_santri jsonb not null default '[]'::jsonb;

-- foto pengajuan: minimal 5, maksimal 10 (data lama tidak diperiksa ulang)
alter table pengajuan drop constraint if exists pengajuan_foto_urls_check;
alter table pengajuan add constraint pengajuan_foto_urls_check
  check (coalesce(array_length(foto_urls,1),0) between 5 and 10) not valid;
alter table pengajuan add constraint pengajuan_dokumen_check
  check (jsonb_typeof(dokumen_santri) = 'array' and jsonb_array_length(dokumen_santri) <= 3) not valid;

create or replace function setujui_pengajuan(p_id bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare p pengajuan; new_id bigint;
begin
  if auth.role() <> 'authenticated' then raise exception 'tidak diizinkan'; end if;
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


-- 7b. DOKUMEN DATA SANTRI: bucket PRIVAT (hanya admin yang bisa membuka), maks 10 MB, PDF / Word / gambar
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumen_santri', 'dokumen_santri', false, 10485760, array['application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy dokumen_unggah_relawan on storage.objects for insert to anon
  with check (bucket_id = 'dokumen_santri' and name like 'pengajuan/%');
create policy dokumen_admin on storage.objects for all to authenticated
  using (bucket_id = 'dokumen_santri') with check (bucket_id = 'dokumen_santri');

