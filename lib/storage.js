import { supabase } from '@/lib/supabase'

export async function uploadFoto(folder, file) {
  const nama = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const up = await supabase.storage.from('dokumentasi').upload(nama, file, { contentType: file.type || 'image/jpeg' })
  if (up.error) throw up.error
  return supabase.storage.from('dokumentasi').getPublicUrl(nama).data.publicUrl
}
