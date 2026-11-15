import { statusAksi } from '@/lib/util'

export const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
export const namaBulan = (d) => d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

// daftar relawan unik pada satu aksi
export function peserta(j) {
  const seen = new Set()
  const out = []
  ;(j.relawan || []).forEach((n) => {
    const k = norm(n)
    if (k && !seen.has(k)) { seen.add(k); out.push(String(n).trim().replace(/\s+/g, ' ')) }
  })
  return out
}

// relawan unik pada sekumpulan aksi (aksi dibatalkan tidak dihitung)
export function relawanTerlibat(aksi) {
  const m = new Map()
  aksi.forEach((j) => { if (statusAksi(j) !== 'dibatalkan') peserta(j).forEach((n) => { if (!m.has(norm(n))) m.set(norm(n), n) }) })
  return [...m.values()]
}

// peringkat relawan. bulan = 'YYYY-MM' atau null (semua waktu).
// hanyaTerlaksana=true: hanya aksi berstatus Terlaksana; false: semua aksi kecuali yang dibatalkan.
export function rekapRelawan(jadwal, bulan = null, hanyaTerlaksana = true) {
  const cnt = new Map()
  const varian = new Map()
  jadwal.forEach((j) => {
    if (bulan && !j.tanggal.startsWith(bulan)) return
    const s = statusAksi(j)
    if (hanyaTerlaksana ? s !== 'terlaksana' : s === 'dibatalkan') return
    peserta(j).forEach((n) => {
      const k = norm(n)
      cnt.set(k, (cnt.get(k) || 0) + 1)
      const v = varian.get(k) || {}
      v[n] = (v[n] || 0) + 1
      varian.set(k, v)
    })
  })
  const arr = [...cnt.entries()]
    .map(([key, jumlah]) => ({ key, jumlah, nama: Object.entries(varian.get(key)).sort((a, b) => b[1] - a[1] || Number(a[0] === a[0].toLowerCase()) - Number(b[0] === b[0].toLowerCase()))[0][0] }))
    .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama, 'id'))
  let rank = 0
  arr.forEach((r, i) => { if (i === 0 || r.jumlah !== arr[i - 1].jumlah) rank = i + 1; r.rank = rank })
  return arr
}

export const ucapan = ({ nama, rank, bulan }) =>
  `Selamat kepada ${nama} atas dukungan kebaikan pada bulan ${bulan}. Terima kasih telah menjadi relawan teraktif ke-${rank} pada program Pangan Sekolah Relawan.`
