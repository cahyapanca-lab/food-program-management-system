'use client'
import { useEffect, useState } from 'react'

// Langganan kalender (.ics) agar jadwal dan pengingatnya muncul otomatis di kalender HP
export default function LanggananKalender() {
  const [origin, setOrigin] = useState('')
  const [salin, setSalin] = useState(false)
  useEffect(() => { setOrigin(window.location.origin) }, [])
  const url = origin ? `${origin}/jadwal.ics` : ''
  const webcal = url.replace(/^https?:/, 'webcal:')
  return (
    <details className="bel-f">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>📲 Notifikasi otomatis di HP</summary>
      <div className="m" style={{ margin: '8px 0' }}>Langganan sekali, lalu jadwal aksi dan pengingatnya muncul sendiri di kalender HP (H-1 pukul 09.00 dan hari-H pukul 08.00).</div>
      <div className="f" style={{ margin: 0 }}>
        <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer"><button type="button" disabled={!origin}>Android / Google</button></a>
        <a href={webcal}><button type="button" className="sec" disabled={!origin}>iPhone</button></a>
        <button type="button" className="sec" disabled={!origin} onClick={() => { navigator.clipboard?.writeText(url); setSalin(true); setTimeout(() => setSalin(false), 2500) }}>{salin ? 'Tersalin ✓' : 'Salin link'}</button>
      </div>
    </details>
  )
}
