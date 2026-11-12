import { supabase } from '@/lib/supabase'

export async function uploadFoto(folder, file) {
  const nama = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const up = await supabase.storage.from('dokumentasi').upload(nama, file, { contentType: file.type || 'image/jpeg' })
  if (up.error) throw up.error
  return supabase.storage.from('dokumentasi').getPublicUrl(nama).data.publicUrl
}

// Berkas data santri -> bucket PRIVAT 'data-santri'. Mengembalikan path (bukan URL publik).
export async function uploadBerkas(folder, file) {
  const aman = file.name.replace(/[^\w.\-]+/g, '_').slice(-80)
  const nama = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${aman}`
  const up = await supabase.storage.from('data-santri').upload(nama, file, { contentType: file.type || 'application/octet-stream' })
  if (up.error) throw up.error
  return nama
}
