import { supabase } from '@/lib/supabase'

export async function uploadFoto(folder, file) {
  const nama = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const up = await supabase.storage.from('dokumentasi').upload(nama, file, { contentType: file.type || 'image/jpeg' })
  if (up.error) throw up.error
  return supabase.storage.from('dokumentasi').getPublicUrl(nama).data.publicUrl
}

const MIME = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
}
export const DOK_EXT = Object.keys(MIME)

// dokumen data santri disimpan di bucket PRIVAT (hanya admin yang bisa membuka lewat tautan sementara)
export async function uploadDokumen(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!MIME[ext]) throw new Error(`Format .${ext || '?'} tidak didukung (gunakan PDF, Word, atau gambar)`)
  const path = `pengajuan/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const up = await supabase.storage.from('dokumen_santri').upload(path, file, { contentType: MIME[ext] })
  if (up.error) throw up.error
  return { nama: file.name.slice(0, 120), path }
}
