'use client'
import { useTable } from '@/lib/useTable'
import { fmt, sum } from '@/lib/util'
import { excelWorkbook } from '@/lib/ekspor'
import TombolUnduh from '@/components/TombolUnduh'

const rp = (n) => 'Rp ' + fmt(n)
const jml = (rows, kf) => {
  const m = {}
  rows.forEach((r) => { const k = kf(r) || 'Lainnya'; m[k] = (m[k] || 0) + Number(r.jumlah || 0) })
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

// Bagian laporan: kolaborasi mitra, penggunaan dana, dan stock opname alat pada periode terpilih
export default function LaporanMitraDana({ mulai, akhir, label }) {
  const { rows: kol } = useTable('kolaborasi', { order: 'tanggal' })
  const { rows: dana } = useTable('penggunaan_dana', { order: 'tanggal' })
  const { rows: alat } = useTable('alat')
  const { rows: opn } = useTable('opname', { order: 'tanggal' })
  const dlm = (r) => r.tanggal >= mulai && r.tanggal <= akhir
  const K = kol.filter(dlm), D = dana.filter(dlm), O = opn.filter(dlm)
  const nama = Object.fromEntries(alat.map((a) => [a.id, a.nama]))
  const perKat = jml(D, (d) => d.kategori)
  const perSumber = jml(D, (d) => d.sumber)
  const stok = alat.map((a) => {
    const o = O.filter((x) => x.alat_id === a.id).sort((p, q) => q.tanggal.localeCompare(p.tanggal) || q.id - p.id)[0]
    return { a, o, n: O.filter((x) => x.alat_id === a.id).length }
  })
  const mitra = new Set(K.map((k) => k.mitra.trim().toLowerCase())).size
  const kpi = [['Kolaborasi mitra', K.length], ['Mitra terlibat', mitra], ['Nilai kontribusi mitra', rp(sum(K, 'nilai'))], ['Dana digunakan', rp(sum(D, 'jumlah'))], ['Catatan opname', O.length]]

  const unduh = () => excelWorkbook([
    { nama: 'Kolaborasi mitra', data: K.map((k) => ({ Tanggal: k.tanggal, Mitra: k.mitra, Jenis: k.jenis, Program: k.program, 'Nilai (Rp)': k.nilai, Keterangan: k.deskripsi })) },
    { nama: 'Penggunaan dana', data: D.map((d) => ({ Tanggal: d.tanggal, Uraian: d.uraian, Kategori: d.kategori, Sumber: d.sumber, Program: d.program, 'Jumlah (Rp)': d.jumlah })) },
    { nama: 'Dana per kategori', data: perKat.map(([k, v]) => ({ Kategori: k, 'Jumlah (Rp)': v })) },
    { nama: 'Dana per sumber', data: perSumber.map(([k, v]) => ({ Sumber: k, 'Jumlah (Rp)': v })) },
    { nama: 'Riwayat opname', data: O.map((o) => ({ Tanggal: o.tanggal, Alat: nama[o.alat_id], Jenis: o.periode, Baik: o.jumlah_baik, Rusak: o.jumlah_rusak, Hilang: o.jumlah_hilang, Petugas: o.petugas, Catatan: o.catatan })) },
    { nama: 'Kondisi alat terakhir', data: stok.map(({ a, o, n }) => ({ Alat: a.nama, Standar: a.jumlah_standar, 'Dicek terakhir': o?.tanggal, Baik: o?.jumlah_baik, Rusak: o?.jumlah_rusak, Hilang: o?.jumlah_hilang, 'Jumlah pengecekan': n })) },
  ], `Mitra_Dana_Opname_${mulai}_${akhir}.xlsx`)

  const mini = (judul, data) => (
    <div className="card" style={{ marginTop: 0 }}>
      <h3>{judul}</h3>
      {data.length === 0 && <div className="m">Tidak ada data.</div>}
      {data.map(([k, v]) => <div className="row" key={k}>{k}<b style={{ float: 'right' }}>{rp(v)}</b></div>)}
    </div>
  )

  return (
    <div className="card">
      <h2>Kolaborasi mitra, dana &amp; stok alat</h2>
      <div className="m">Periode: <b>{label}</b></div>
      <div className="grid" style={{ marginTop: 12 }}>{kpi.map(([n, v]) => <div className="card kpi" key={n}><b>{v}</b><span>{n}</span></div>)}</div>
      <div className="grid2" style={{ marginTop: 12 }}>{mini('Dana per kategori', perKat)}{mini('Dana per sumber', perSumber)}</div>
      <h3 style={{ marginTop: 14 }}>Kondisi alat (pengecekan terakhir dalam periode)</h3>
      <div className="sc"><table>
        <thead><tr><th>Alat</th><th>Dicek terakhir</th><th>Baik</th><th>Rusak</th><th>Hilang</th><th>Jumlah pengecekan</th></tr></thead>
        <tbody>
          {stok.length === 0 && <tr><td colSpan={6} className="m">Belum ada alat.</td></tr>}
          {stok.map(({ a, o, n }) => <tr key={a.id}><td>{a.nama}</td><td>{o?.tanggal || 'Tidak dicek'}</td><td>{o?.jumlah_baik ?? '-'}</td><td>{o?.jumlah_rusak ?? '-'}</td><td>{o?.jumlah_hilang ?? '-'}</td><td>{n}</td></tr>)}
        </tbody>
      </table></div>
      <div className="f" style={{ marginTop: 14 }}><TombolUnduh label="⬇ Excel kolaborasi, dana & opname" onRun={unduh} /></div>
    </div>
  )
}
