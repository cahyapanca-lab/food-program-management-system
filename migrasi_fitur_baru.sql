-- Jalankan SEKALI di Supabase > SQL Editor > New query > Run
-- 1. Foto pengajuan: minimal 5 diatur di form, batas database naik dari 5 ke 10
alter table pengajuan drop constraint if exists pengajuan_foto_urls_check;
alter table pengajuan add constraint pengajuan_foto_urls_check
  check (coalesce(array_length(foto_urls,1),0) <= 10);

-- 2. Kolom baru: keterangan opsional relawan + daftar berkas data santri
alter table pengajuan
  add column if not exists catatan_relawan text check (char_length(catatan_relawan) <= 1500),
  add column if not exists file_santri text[] not null default '{}'
    check (coalesce(array_length(file_santri,1),0) <= 10);

-- 3. Bucket PRIVAT untuk data santri (maks 10 MB per file; PDF, Word, gambar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('data-santri', 'data-santri', false, 10485760, array[
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- relawan (tanpa login) hanya boleh MENGUNGGAH; hanya admin yang boleh membaca/mengunduh
create policy santri_unggah_relawan on storage.objects for insert to anon
  with check (bucket_id = 'data-santri' and name like 'pengajuan/%');
create policy santri_admin on storage.objects for all to authenticated
  using (bucket_id = 'data-santri') with check (bucket_id = 'data-santri');
