'use client'
import { useMemo, useState } from 'react'
import { useTable } from '@/lib/useTable'
import { iso, fmt } from '@/lib/util'
import { buatRekap, hitungRekap } from '@/lib/rekap'
import { excelJadwal } from '@/lib/ekspor'
import TombolUnduh from '@/components/TombolUnduh'

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const fmtTgl = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

export default function LaporanPage() {
  const { rows: jadwal, error } = useTable('jadwal_aksi', { order: 'tanggal' })
  const { rows: aset } = useTable('aset')
  const { rows: pengajuan } = useTable('pengajuan')
  const now = new Date()
  const [jenis, setJenis] = useState('mingguan')
  const [tgl, setTgl] = useState(iso(now))
  const [bln, setBln] = useState(now.getMonth())
  const [thn, setThn] = useState(now.getFullYear())

  const periode = useMemo(() => {
    if (jenis === 'mingguan') {
      const [y, m, d] = (tgl || iso(now)).split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      const s = new Date(y, m - 1, d - ((dt.getDay() + 6) % 7))
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
      return { mulai: iso(s), akhir: iso(e), label: `${fmtTgl(s)} - ${fmtTgl(e)}` }
    }
    return { mulai: iso(new Date(thn, bln, 1)), akhir: iso(new Date(thn, bln + 1, 0)), label: `${BULAN[bln]} ${thn}` }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenis, tgl, bln, thn])

  const st = hitungRekap({ jenis, ...periode, jadwal, aset, pengajuan })
  const kpi = [['Total aksi', st.aksi.length], ['Terlaksana', st.terlaksana], ['FFC', st.ffc.length], ['BUYD', st.buyd.length],
    ['Total porsi', fmt(st.porsi)], ['Total beras (kg)', fmt(st.kg)], ['Penerima manfaat', fmt(st.pm)], ['Aset baru', st.asetBaru.length]]

  return (
    <>
      <h1>Laporan &amp; Rekap</h1>
      <div className="m">Unduh rekap aksi dalam PowerPoint yang bisa diedit (lengkap dengan grafik), atau Excel</div>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <div className="f">
          <select value={jenis} onChange={(e) => setJenis(e.target.value)}>
            <option value="mingguan">Rekap mingguan</option><option value="bulanan">Rekap bulanan</option>
          </select>
          {jenis === 'mingguan' ? (
            <label style={{ margin: 0 }}>Pilih tanggal (minggu Senin-Minggu yang memuat tanggal ini)<input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} /></label>
          ) : (
            <>
              <select value={bln} onChange={(e) => setBln(Number(e.target.value))}>{BULAN.map((b, i) => <option key={b} value={i}>{b}</option>)}</select>
              <select value={thn} onChange={(e) => setThn(Number(e.target.value))}>{[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y}>{y}</option>)}</select>
            </>
          )}
        </div>
        <div className="m">Periode: <b>{periode.label}</b></div>
        <div className="grid" style={{ marginTop: 12 }}>
          {kpi.map(([n, v]) => <div className="card kpi" key={n}><b>{v}</b><span>{n}</span></div>)}
        </div>
        <div className="f" style={{ marginTop: 14 }}>
          <TombolUnduh className="" label="⬇ Unduh PPT (editable)" onRun={() => buatRekap({ jenis, ...periode, jadwal, aset, pengajuan })} />
          <TombolUnduh label="⬇ Excel daftar aksi" onRun={() => excelJadwal(st.aksi, `Aksi_${jenis}_${periode.mulai}.xlsx`)} />
        </div>
        <div className="m">PPT berisi: sampul, ringkasan, infografis program dan kota, tren, aset baru, dan daftar aksi. Semua teks dan grafik bisa diedit di PowerPoint.</div>
      </div>
    </>
  )
}
