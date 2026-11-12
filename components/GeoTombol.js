'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MAPS_KEY, loadGoogleMaps } from '@/lib/maps'

// Cari titik lokasi otomatis lewat Google Geocoding untuk data yang belum punya titik.
// Hasil disimpan sebagai "perkiraan"; hasil yang terlalu umum (setingkat kota) dilewati.
export default function GeoTombol({ table, rows, query, onDone }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const todo = rows.filter((r) => r.latitude === null || r.latitude === undefined || r.longitude === null || r.longitude === undefined)
  if (!MAPS_KEY) return null
  if (todo.length === 0) return <span className="m">Semua data sudah punya titik lokasi.</span>

  async function jalan() {
    if (!confirm(`Cari titik lokasi untuk ${todo.length} data lewat Google Maps? Hasilnya perkiraan, mohon diperiksa lagi.`)) return
    setBusy(true)
    let ok = 0, gagal = 0
    try {
      const maps = await loadGoogleMaps()
      const geocoder = new maps.Geocoder()
      for (let i = 0; i < todo.length; i++) {
        setMsg(`Memproses ${i + 1} / ${todo.length}…`)
        const r = todo[i]
        try {
          const res = await geocoder.geocode({ address: query(r), region: 'ID' })
          const g = res.results && res.results[0] && res.results[0].geometry
          if (g && g.location_type !== 'APPROXIMATE') {
            await supabase.from(table).update({ latitude: g.location.lat(), longitude: g.location.lng(), titik_perkiraan: true }).eq('id', r.id)
            ok++
          } else gagal++
        } catch { gagal++ }
        await new Promise((res) => setTimeout(res, 150))
      }
    } catch (e) {
      setMsg('Gagal: ' + e.message); setBusy(false); return
    }
    setMsg(`Selesai: ${ok} titik ditemukan, ${gagal} belum ditemukan (isi manual lewat Edit).`)
    setBusy(false)
    if (onDone) onDone()
  }

  return (
    <>
      <button type="button" className="sec" disabled={busy} onClick={jalan}>📍 Lengkapi {todo.length} titik lokasi otomatis</button>
      {msg && <span className="m">{msg}</span>}
    </>
  )
}
