import { statusAksi } from '@/lib/util'
import { terlambatTugas } from '@/lib/tugas'
import { tambahHari } from '@/lib/kalender'

const tgl = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
const selisih = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000)

// Pengingat untuk publik: aksi 7 hari ke depan
export function pengingatPublik(events, hari) {
  const batas = tambahHari(hari, 7)
  return events
    .filter((e) => !e.selesai && e.tanggal >= hari && e.tanggal <= batas)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .map((e) => {
      const s = selisih(e.tanggal, hari)
      const [lb, k] = s === 0 ? ['Hari ini', 'bad'] : s === 1 ? ['Besok', 'urgent'] : [`${s} hari lagi`, '']
      return { key: `${e.id}:${e.tanggal}`, k, lb, teks: e.lokasi, info: `${tgl(e.tanggal)}${e.kota ? ` · ${e.kota}` : ''}`, aksi: e }
    })
}

// Pengingat untuk PIC: to-do, aksi, dan pengajuan
export function pengingatAdmin({ jadwal, tugas, pengajuan, hari }) {
  const h3 = tambahHari(hari, 3)
  const aktifT = tugas.filter((t) => t.status !== 'selesai')
  const menunggu = pengajuan.filter((p) => p.status === 'baru').length
  return [
    ...aktifT.filter((t) => terlambatTugas(t, hari)).map((t) => ({ key: `tt${t.id}`, k: 'bad', lb: 'To-do terlambat', teks: t.judul, info: `tenggat ${tgl(t.tenggat)}${t.penanggung_jawab ? ` · ${t.penanggung_jawab}` : ''}`, href: '/pic/tugas' })),
    ...jadwal.filter((j) => statusAksi(j) === 'terjadwal' && j.tanggal < hari && j.tanggal >= tambahHari(hari, -30)).map((j) => ({ key: `al${j.id}`, k: 'bad', lb: 'Belum dilaporkan', teks: `${j.program}: ${j.lokasi}`, info: `jadwal ${tgl(j.tanggal)} sudah lewat`, aksi: j })),
    ...jadwal.filter((j) => statusAksi(j) === 'terjadwal' && j.tanggal >= hari && j.tanggal <= h3).map((j) => ({ key: `ak${j.id}`, k: 'urgent', lb: j.tanggal === hari ? 'Aksi hari ini' : `Aksi ${tgl(j.tanggal)}`, teks: `${j.program}: ${j.lokasi}`, info: j.kota || '', aksi: j })),
    ...aktifT.filter((t) => t.tenggat && t.tenggat >= hari && t.tenggat <= h3).map((t) => ({ key: `ts${t.id}`, k: 'urgent', lb: t.tenggat === hari ? 'To-do hari ini' : `To-do ${tgl(t.tenggat)}`, teks: t.judul, info: t.penanggung_jawab || '', href: '/pic/tugas' })),
    ...(menunggu ? [{ key: 'pgj', k: '', lb: 'Pengajuan', teks: `${menunggu} pengajuan aset baru menunggu verifikasi`, info: '', href: '/pic/pengajuan' }] : []),
  ]
}
