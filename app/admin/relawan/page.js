'use client'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { rekapRelawan, peserta, norm } from '@/lib/relawan'
import { excelRows } from '@/lib/ekspor'
import TanggaJuara from '@/components/TanggaJuara'
import TombolUnduh from '@/components/TombolUnduh'

export default function RelawanPage() {
  const { rows, reload, error } = useTable('jadwal_aksi', { order: 'tanggal' })
  const [dari, setDari] = useState('')
  const [ke, setKe] = useState('')
  const [msg, setMsg] = useState('')

  const daftar = useMemo(() => {
    const ikut = rekapRelawan(rows, null, false)
    const jalan = new Map(rekapRelawan(rows, null, true).map((r) => [r.key, r]))
    return ikut
      .map((r) => ({ key: r.key, nama: r.nama, diikuti: r.jumlah, terlaksana: jalan.get(r.key)?.jumlah || 0, rank: jalan.get(r.key)?.rank || null }))
      .sort((a, b) => b.terlaksana - a.terlaksana || b.diikuti - a.diikuti || a.nama.localeCompare(b.nama, 'id'))
  }, [rows])

  async function rapikan() {
    const baru = ke.trim().replace(/\s+/g, ' ')
    if (!dari || !baru) return setMsg('Pilih nama yang mau diganti dan isi nama baru.')
    if (!confirm(`Ganti semua "${dari}" menjadi "${baru}" di seluruh jadwal aksi?`)) return
    let n = 0
    for (const j of rows) {
      const nama = peserta(j)
      if (!nama.some((x) => norm(x) === norm(dari))) continue
      const hasil = []
      nama.forEach((x) => { const v = norm(x) === norm(dari) ? baru : x; if (!hasil.some((y) => norm(y) === norm(v))) hasil.push(v) })
      const { error } = await supabase.from('jadwal_aksi').update({ relawan: hasil }).eq('id', j.id)
      if (error) return setMsg('Gagal: ' + error.message)
      n++
    }
    setMsg(`Selesai: ${n} jadwal diperbarui.`)
    setDari(''); setKe('')
    reload()
  }

  return (
    <>
      <h1>Rekap Relawan</h1>
      <div className="m">Relawan yang sering ikut kegiatan Program Pangan. Nama diisi di tiap Jadwal Aksi.</div>
      {error && <div className="err">{error}</div>}
      <div className="card"><TanggaJuara jadwal={rows} /></div>

      <div className="card">
        <div className="f" style={{ justifyContent: 'space-between', margin: 0 }}>
          <h2 style={{ margin: 0 }}>Semua relawan ({daftar.length})</h2>
          <TombolUnduh label="⬇ Excel rekap relawan" onRun={() => excelRows(daftar.map((r) => ({ 'Peringkat (terlaksana)': r.rank ?? '-', Nama: r.nama, 'Aksi terlaksana': r.terlaksana, 'Aksi diikuti (semua status)': r.diikuti })), 'Relawan', 'Rekap_Relawan.xlsx')} />
        </div>
        {daftar.length === 0 && <div className="m" style={{ marginTop: 8 }}>Belum ada relawan tercatat. Isi kolom "Relawan yang terlibat" saat menambah atau mengubah jadwal aksi.</div>}
        {daftar.length > 0 && (
          <div className="sc" style={{ marginTop: 8 }}><table>
            <thead><tr><th>Peringkat</th><th>Nama</th><th>Aksi terlaksana</th><th>Aksi diikuti (semua status)</th></tr></thead>
            <tbody>{daftar.map((r) => <tr key={r.key}><td>{r.rank ?? '-'}</td><td>{r.nama}</td><td>{r.terlaksana}</td><td>{r.diikuti}</td></tr>)}</tbody>
          </table></div>
        )}
      </div>

      <div className="card">
        <h2>Rapikan nama relawan</h2>
        <div className="m">Gunakan jika satu orang tertulis dengan ejaan berbeda, supaya hitungannya digabung.</div>
        <div className="f">
          <select value={dari} onChange={(e) => setDari(e.target.value)}><option value="">Pilih nama yang diganti</option>{daftar.map((r) => <option key={r.key}>{r.nama}</option>)}</select>
          <input value={ke} onChange={(e) => setKe(e.target.value)} placeholder="Nama yang benar" />
          <button onClick={rapikan}>Ganti</button>
        </div>
        {msg && <div className={msg.startsWith('Gagal') ? 'err' : 'ok'}>{msg}</div>}
      </div>
    </>
  )
}
