'use client'
import { useMemo, useState } from 'react'
import { useTable } from '@/lib/useTable'
import { iso, fmt } from '@/lib/util'
import { buatRekap, hitungRekap, excelRekapLengkap } from '@/lib/rekap'
import { excelJadwal } from '@/lib/ekspor'
import TombolUnduh from '@/components/TombolUnduh'
import LaporanMitraDana from '@/components/LaporanMitraDana'

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const fmtTgl = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

export default function LaporanPage() {
  const { rows: jadwal, error } = useTable('jadwal_aksi', { order: 'tanggal' })
  const { rows: aset } = useTable('aset')
  const { rows: pengajuan } = useTable('pengajuan')
  const { rows: tugas } = useTable('tugas')
  const { rows: kolaborasi } = useTable('kolaborasi', { order: 'tanggal' })
  const { rows: dana } = useTable('penggunaan_dana', { order: 'tanggal' })
  const { rows: alat } = useTable('alat')
  const { rows: opname } = useTable('opname', { order: 'tanggal' })
  const now = new Date()
  const [jenis, setJenis] = useState('mingguan')
  const [tgl, setTgl] = useState(iso(now))
  const [bln, setBln] = useState(now.getMonth())
  const [thn, setThn] = useState(now.getFullYear())
  const [sem, setSem] = useState(now.getMonth() < 6 ? 0 : 1)

  const periode = useMemo(() => {
    if (jenis === 'mingguan') {
      const [y, m, d] = (tgl || iso(now)).split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      const s = new Date(y, m - 1, d - ((dt.getDay() + 6) % 7))
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
      return { mulai: iso(s), akhir: iso(e), label: `${fmtTgl(s)} - ${fmtTgl(e)}` }
    }
    if (jenis === 'semester') return { mulai: iso(new Date(thn, sem * 6, 1)), akhir: iso(new Date(thn, sem * 6 + 6, 0)), label: `Semester ${sem + 1} ${thn} (${BULAN[sem * 6]} - ${BULAN[sem * 6 + 5]})` }
    if (jenis === 'tahunan') return { mulai: iso(new Date(thn, 0, 1)), akhir: iso(new Date(thn, 12, 0)), label: `Tahun ${thn}` }
    return { mulai: iso(new Date(thn, bln, 1)), akhir: iso(new Date(thn, bln + 1, 0)), label: `${BULAN[bln]} ${thn}` }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenis, tgl, bln, thn, sem])

  const st = hitungRekap({ jenis, ...periode, jadwal, aset, pengajuan, tugas })
  const kpi = [['Total aksi', st.aksi.length], ['Terlaksana', st.terlaksana], ['Aksi terkendala', st.kendala.length], ['Relawan terlibat', st.relawan.length],
    ['FFC', st.ffc.length], ['BUYD', st.buyd.length], ['Total porsi', fmt(st.porsi)], ['Total beras (kg)', fmt(st.kg)], ['Penerima manfaat', fmt(st.pm)],
    ['Aset baru (periode)', st.asetBaru.length], ['Total aset (lama + baru)', st.totalAset],
    ['To-do selesai (periode)', st.tugasStat.selesai], ['To-do terlambat', st.tugasStat.terlambat]]
  const data = { jenis, ...periode, jadwal, aset, pengajuan, tugas, kolaborasi, dana, alat, opname }

  return (
    <>
      <h1>Laporan &amp; Rekap</h1>
      <div className="m">Unduh rekap aksi dalam PowerPoint yang bisa diedit (lengkap dengan grafik), atau Excel</div>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <div className="f">
          <select value={jenis} onChange={(e) => setJenis(e.target.value)}>
            <option value="mingguan">Rekap mingguan</option><option value="bulanan">Rekap bulanan</option><option value="semester">Rekap per 6 bulan</option><option value="tahunan">Rekap tahunan</option>
          </select>
          {jenis === 'mingguan' ? (
            <label style={{ margin: 0 }}>Pilih tanggal (minggu Senin-Minggu yang memuat tanggal ini)<input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} /></label>
          ) : (
            <>
              {jenis === 'bulanan' && <select value={bln} onChange={(e) => setBln(Number(e.target.value))}>{BULAN.map((b, i) => <option key={b} value={i}>{b}</option>)}</select>}
              {jenis === 'semester' && <select value={sem} onChange={(e) => setSem(Number(e.target.value))}><option value={0}>Semester 1 (Jan-Jun)</option><option value={1}>Semester 2 (Jul-Des)</option></select>}
              <select value={thn} onChange={(e) => setThn(Number(e.target.value))}>{[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y}>{y}</option>)}</select>
            </>
          )}
        </div>
        <div className="m">Periode: <b>{periode.label}</b></div>
        <div className="grid" style={{ marginTop: 12 }}>
          {kpi.map(([n, v]) => <div className="card kpi" key={n}><b>{v}</b><span>{n}</span></div>)}
        </div>
        <div className="f" style={{ marginTop: 14 }}>
          <TombolUnduh className="" label="⬇ Unduh PPT (editable)" onRun={() => buatRekap(data)} />
          <TombolUnduh label="⬇ Excel lengkap (aksi + semua aset + relawan)" onRun={() => excelRekapLengkap(data)} />
          <TombolUnduh label="⬇ Excel daftar aksi saja" onRun={() => excelJadwal(st.aksi, `Aksi_${jenis}_${periode.mulai}.xlsx`)} />
        </div>
        <div className="m">
          PPT berisi: sampul, ringkasan, infografis program dan kota, tren, kendala &amp; bottleneck, relawan terlibat, to-do &amp; tindak lanjut, {jenis === 'bulanan' ? 'apresiasi relawan (tangga juara), ' : ''}data aset keseluruhan (lama + baru), aset baru periode ini, kolaborasi mitra, penggunaan dana, stock opname alat, dan daftar aksi.
          Excel lengkap berisi sheet ringkasan, aksi periode, kendala, seluruh data aset (data lama dan baru, ada kolom sumber data), pengajuan, relawan, dan to-do.
        </div>
      </div>
      <LaporanMitraDana mulai={periode.mulai} akhir={periode.akhir} label={periode.label} />
    </>
  )
}
