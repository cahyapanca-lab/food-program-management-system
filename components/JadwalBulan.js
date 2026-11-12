'use client'
import { useState } from 'react'
import Kalender from '@/components/Kalender'
import PetaSemua from '@/components/PetaSemua'
import PetaEmbed from '@/components/PetaEmbed'
import { fmt, sum, porsiOf, kgOf } from '@/lib/util'

// Kalender + ringkasan + daftar aksi untuk bulan yang dipilih.
// Jika onEvent diberikan (admin), klik jadwal memanggilnya; jika tidak, tampil detail.
export default function JadwalBulan({ events, onDay, onEvent }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [sel, setSel] = useState(null)
  const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const list = events.filter((e) => e.tanggal.startsWith(key)).sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const pick = onEvent || setSel
  const ringkas = [
    ['Total aksi', list.length],
    ['FFC', list.filter((e) => e.program === 'FFC').length],
    ['BUYD', list.filter((e) => e.program === 'BUYD').length],
    ['Terlaksana', list.filter((e) => e.selesai).length],
    ['Total porsi', fmt(porsiOf(list))],
    ['Total beras (kg)', fmt(kgOf(list))],
    ['Penerima manfaat', fmt(sum(list, 'jumlah_pm'))],
  ]

  return (
    <>
      <Kalender events={events} month={month} onMonth={(m) => { setMonth(m); setSel(null) }} onDay={onDay} onEvent={pick} />
      <h3 style={{ marginTop: 18 }}>Ringkasan bulan ini</h3>
      <div className="grid">
        {ringkas.map(([n, v]) => <div className="card kpi" key={n}><b>{v}</b><span>{n}</span></div>)}
      </div>

      {list.some((e) => e.latitude != null && e.longitude != null) || onEvent ? (
        <>
          <h3 style={{ marginTop: 18 }}>Peta lokasi aksi bulan ini</h3>
          <PetaSemua height={320} items={list.filter((e) => e.latitude != null && e.longitude != null).map((e) => ({
            id: e.id, lat: e.latitude, lng: e.longitude, title: e.lokasi, program: e.program,
            sub: `${new Date(e.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}${e.kota ? ' - ' + e.kota : ''}`,
          }))} />
        </>
      ) : null}

      {sel && (
        <div className="card">
          <b>{sel.lokasi}</b> <span className={`tag ${sel.program}`}>{sel.program}</span> {sel.selesai && <span className="m">(sudah terlaksana)</span>}
          <div className="m" style={{ marginTop: 6 }}>
            {sel.kota ? `${sel.kota} - ` : ''}
            {new Date(sel.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ marginTop: 6 }}>
            {sel.jumlah_bantuan ? `${sel.jumlah_bantuan} ${sel.satuan || ''}` : ''}
            {sel.jumlah_pm ? ` - ${sel.jumlah_pm} penerima manfaat` : ''}
          </div>
          {sel.segmentasi && <div className="m">{sel.segmentasi}</div>}
          <PetaEmbed lat={sel.latitude} lng={sel.longitude} q={`${sel.lokasi} ${sel.kota || ''}`} />
          <div className="f"><button className="sec" onClick={() => setSel(null)}>Tutup</button></div>
        </div>
      )}

      <h3 style={{ marginTop: 18 }}>Daftar aksi bulan ini</h3>
      {list.length === 0 && <div className="m">Belum ada jadwal di bulan ini.</div>}
      {list.length > 0 && (
        <div className="sc"><table>
          <thead><tr><th>Tanggal</th><th>Program</th><th>Kota</th><th>Lokasi</th><th>Bantuan</th><th>PM</th><th>Status</th></tr></thead>
          <tbody>{list.map((e) => (
            <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => pick(e)}>
              <td>{new Date(e.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
              <td><span className={`tag ${e.program}`}>{e.program}</span></td>
              <td>{e.kota}</td><td>{e.lokasi}</td>
              <td>{e.jumlah_bantuan ? `${e.jumlah_bantuan} ${e.satuan || ''}` : '-'}</td>
              <td>{e.jumlah_pm ?? '-'}</td>
              <td>{e.selesai ? '✅ Terlaksana' : '🗓 Terjadwal'}</td>
            </tr>))}
          </tbody></table></div>
      )}
    </>
  )
}
