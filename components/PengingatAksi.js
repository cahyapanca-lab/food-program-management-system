'use client'
import { useEffect, useState } from 'react'
import { iso, fmt } from '@/lib/util'
import { googleCalUrl, unduhIcs, tambahHari, judulAksi } from '@/lib/kalender'

const KUNCI = 'fpms_pengingat_ditutup'

function labelHari(selisih) {
  if (selisih === 0) return ['Hari ini', 'bad']
  if (selisih === 1) return ['Besok', 'urgent']
  return [`${selisih} hari lagi`, '']
}

// Pengingat jadwal aksi 7 hari ke depan + cara mendapat notifikasi di HP (langganan kalender)
export default function PengingatAksi({ events }) {
  const [ditutup, setDitutup] = useState([])
  const [origin, setOrigin] = useState('')
  const [salin, setSalin] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
    try { setDitutup(JSON.parse(localStorage.getItem(KUNCI) || '[]')) } catch { /* abaikan */ }
  }, [])

  const hari = iso(new Date())
  const batas = tambahHari(hari, 7)
  const daftar = events
    .filter((e) => !e.selesai && e.tanggal >= hari && e.tanggal <= batas)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const tampil = daftar.filter((e) => !ditutup.includes(`${e.id}:${e.tanggal}`))

  function tutup(e) {
    const baru = [...ditutup, `${e.id}:${e.tanggal}`]
    setDitutup(baru)
    try { localStorage.setItem(KUNCI, JSON.stringify(baru)) } catch { /* abaikan */ }
  }
  const selisih = (tgl) => Math.round((new Date(`${tgl}T00:00:00Z`) - new Date(`${hari}T00:00:00Z`)) / 86400000)
  const urlIcs = origin ? `${origin}/jadwal.ics` : ''
  const webcal = urlIcs.replace(/^https?:/, 'webcal:')
  const waText = (e) => `Pengingat aksi Program Pangan: ${judulAksi(e)}${e.kota ? ` (${e.kota})` : ''} pada ${new Date(e.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`

  return (
    <div>
      <h3 style={{ marginBottom: 6 }}>🔔 Pengingat aksi 7 hari ke depan</h3>
      {daftar.length === 0 && <div className="m">Tidak ada aksi terjadwal dalam 7 hari ke depan.</div>}
      {daftar.length > 0 && tampil.length === 0 && (
        <div className="m">Semua pengingat sudah ditutup. <button type="button" className="sec" onClick={() => { setDitutup([]); try { localStorage.removeItem(KUNCI) } catch { /* abaikan */ } }}>Tampilkan lagi</button></div>
      )}
      {tampil.map((e) => {
        const [lb, kelas] = labelHari(selisih(e.tanggal))
        return (
          <div className="notif" key={e.id}>
            <div className="rem" style={{ borderBottom: 0, padding: 0 }}>
              <span className={`lb ${kelas}`}>{lb}</span>
              <div style={{ flex: 1 }}>
                <b>{e.lokasi}</b> <span className={`tag ${e.program}`}>{e.program}</span>
                <div className="m">{new Date(e.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}{e.kota ? ` - ${e.kota}` : ''}{e.jumlah_bantuan ? ` - ${fmt(e.jumlah_bantuan)} ${e.satuan || ''}` : ''}</div>
              </div>
              <button type="button" className="sec" onClick={() => tutup(e)} aria-label="Tutup pengingat">×</button>
            </div>
            <div className="f" style={{ marginBottom: 0 }}>
              <a href={googleCalUrl(e)} target="_blank" rel="noreferrer"><button type="button" className="sec">📅 Google Kalender</button></a>
              <button type="button" className="sec" onClick={() => unduhIcs([e], `aksi-${e.tanggal}.ics`)}>⬇ .ics (iPhone / lainnya)</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(waText(e))}`} target="_blank" rel="noreferrer"><button type="button" className="sec">💬 Bagikan WhatsApp</button></a>
            </div>
          </div>
        )
      })}

      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>📲 Dapatkan notifikasi otomatis di HP</summary>
        <div className="m" style={{ marginTop: 8 }}>
          Langganan kalender sekali, lalu semua jadwal aksi dan pengingatnya (H-1 pukul 09.00 dan hari-H pukul 08.00) muncul sendiri di aplikasi kalender HP dan diperbarui otomatis.
        </div>
        <div className="f">
          <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer"><button type="button" disabled={!origin}>Langganan di Google Calendar (Android)</button></a>
          <a href={webcal}><button type="button" className="sec" disabled={!origin}>Langganan di iPhone / Apple Calendar</button></a>
          <button type="button" className="sec" disabled={!origin} onClick={() => { navigator.clipboard?.writeText(urlIcs); setSalin(true); setTimeout(() => setSalin(false), 2500) }}>{salin ? 'Tersalin ✓' : 'Salin link kalender'}</button>
        </div>
        <div className="m">Di Google Calendar versi komputer: Setelan &gt; Tambahkan kalender &gt; Dari URL, lalu tempel link kalender. Pengingat bawaan kalender HP bisa diatur dari aplikasi kalendernya.</div>
      </details>
    </div>
  )
}
