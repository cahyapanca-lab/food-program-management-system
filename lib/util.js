export const TAHUN = new Date().getFullYear()
export const fmt = (n) => Number(n || 0).toLocaleString('id-ID')
export const sum = (a, k) => a.reduce((s, x) => s + (Number(x[k]) || 0), 0)

export function count(a, f) {
  const o = {}
  a.forEach((x) => { const k = f(x) || '-'; o[k] = (o[k] || 0) + 1 })
  return Object.entries(o).sort((a, b) => b[1] - a[1])
}

export function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function waNumber(phone) {
  if (!phone) return null
  let n = String(phone).replace(/\D/g, '')
  if (n.startsWith('0')) n = '62' + n.slice(1)
  else if (n.startsWith('8')) n = '62' + n
  return n.length >= 10 ? n : null
}

export function waLink(phone, text) {
  const n = waNumber(phone)
  if (!n) return null
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`

export const porsiOf = (a) => sum(a.filter((j) => /porsi/i.test(j.satuan || '')), 'jumlah_bantuan')
export const kgOf = (a) => sum(a.filter((j) => /kg/i.test(j.satuan || '')), 'jumlah_bantuan')

// urutkan: nilai kosong selalu di bawah
export function cmp(a, b, key, dir) {
  const va = a[key], vb = b[key]
  const ea = va === null || va === undefined || va === ''
  const eb = vb === null || vb === undefined || vb === ''
  if (ea && eb) return 0
  if (ea) return 1
  if (eb) return -1
  const r = typeof va === 'number' && typeof vb === 'number'
    ? va - vb
    : String(va).localeCompare(String(vb), 'id', { numeric: true })
  return dir === 'asc' ? r : -r
}

// kecilkan foto agar upload cepat dan hemat penyimpanan
export async function compressImage(file, max = 1280, quality = 0.72) {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale)
    c.height = Math.round(bmp.height * scale)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', quality))
    if (!blob) return file
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
