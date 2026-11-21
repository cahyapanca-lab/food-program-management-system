'use client'
import { useMemo, useState } from 'react'
import { excelWorkbook } from '@/lib/ekspor'
import TombolUnduh from '@/components/TombolUnduh'

const pendek = (u) => (u.length > 56 ? u.slice(0, 53) + '…' : u)

// Bagian laporan: daftar tautan dokumentasi aset (aset baru pada periode atau semua aset)
export default function LaporanDokumentasi({ aset, asetBaru, label }) {
  const [cakup, setCakup] = useState('semua')
  const [prog, setProg] = useState('')
  const [hanyaLink, setHanyaLink] = useState(true)
  const kolomAda = aset.length === 0 || 'link_dokumentasi' in aset[0]

  const sumber = useMemo(() => (cakup === 'baru' ? asetBaru : aset).filter((a) => !prog || a.program === prog), [cakup, prog, aset, asetBaru])
  const punya = sumber.filter((a) => a.link_dokumentasi)
  const list = (hanyaLink ? punya : sumber).slice().sort((p, q) => (p.nama || '').localeCompare(q.nama || ''))

  const unduh = () => excelWorkbook([{
    nama: 'Dokumentasi aset',
    data: list.map((a) => ({ 'Nama aset': a.nama, Kota: a.kota, Cluster: a.cluster, Program: a.program, 'Link dokumentasi': a.link_dokumentasi || '' })),
  }], `Dokumentasi_Aset_${new Date().toISOString().slice(0, 10)}.xlsx`)

  return (
    <div className="card">
      <h2>Dokumentasi aset</h2>
      <div className="m">Tautan dokumentasi (mis. folder Google Drive) tiap aset. Isi di PIC › Data Aset › Edit. Tautan juga ikut di Excel lengkap dan PPT (aset baru periode ini): <b>{label}</b></div>
      {!kolomAda && <div className="err" style={{ marginTop: 8 }}>Kolom link dokumentasi belum ada di database. Jalankan migrasi_v11.sql di Supabase.</div>}
      <div className="f">
        <select value={cakup} onChange={(e) => setCakup(e.target.value)}><option value="semua">Semua aset</option><option value="baru">Aset baru periode ini</option></select>
        <select value={prog} onChange={(e) => setProg(e.target.value)}><option value="">Semua program</option><option value="FFC">FFC</option><option value="BUYD">BUYD</option></select>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}><input type="checkbox" checked={hanyaLink} onChange={(e) => setHanyaLink(e.target.checked)} /> Hanya yang sudah ada link</label>
      </div>
      <div className="m" style={{ margin: '8px 0' }}><b>{punya.length}</b> dari {sumber.length} aset sudah punya link dokumentasi{sumber.length - punya.length > 0 ? ` · ${sumber.length - punya.length} belum` : ''}.</div>
      <div className="sc"><table>
        <thead><tr><th>Nama aset</th><th>Kota</th><th>Program</th><th>Dokumentasi</th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={4} className="m">Tidak ada aset untuk pilihan ini.</td></tr>}
          {list.slice(0, 300).map((a) => (
            <tr key={a.id}>
              <td>{a.nama}</td><td>{a.kota || '-'}</td>
              <td>{a.program ? <span className={`tag ${a.program}`}>{a.program}</span> : '-'}</td>
              <td>{a.link_dokumentasi ? <a href={a.link_dokumentasi} target="_blank" rel="noreferrer">{pendek(a.link_dokumentasi)}</a> : <span className="m">Belum ada link</span>}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {list.length > 300 && <div className="m">Menampilkan 300 dari {list.length}; unduh Excel untuk daftar lengkap.</div>}
      <div className="f" style={{ marginTop: 10 }}><TombolUnduh label="⬇ Excel dokumentasi aset" onRun={unduh} /></div>
    </div>
  )
}
