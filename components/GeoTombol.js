'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// Cari titik lokasi otomatis lewat OpenStreetMap Nominatim (gratis) untuk data yang belum punya titik.
// Hasil disimpan sebagai "perkiraan"; hasil yang terlalu umum (setingkat kota atau lebih besar) dilewati.
// Nominatim membatasi sekitar 1 permintaan per detik, jadi prosesnya berjalan pelan.
const TERLALU_UMUM = ['country', 'state', 'region', 'state_district', 'county', 'city', 'municipality', 'province', 'island', 'archipelago']

export default function GeoTombol({ table, rows, query, onDone }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const todo = rows.filter((r) => r.latitude === null || r.latitude === undefined || r.longitude === null || r.longitude === undefined)
  if (todo.length === 0) return <span className="m">Semua data sudah punya titik lokasi.</span>

  async function jalan() {
    const menit = Math.ceil((todo.length * 1.2) / 60)
    if (!confirm(`Cari titik lokasi untuk ${todo.length} data lewat OpenStreetMap? Perkiraan waktu sekitar ${menit} menit, jangan tutup halaman. Hasilnya perkiraan, mohon diperiksa lagi.`)) return
    setBusy(true)
    let ok = 0, gagal = 0
    for (let i = 0; i < todo.length; i++) {
      setMsg(`Memproses ${i + 1} / ${todo.length}…`)
      const r = todo[i]
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=id&accept-language=id&q=${encodeURIComponent(query(r))}`
        const res = await fetch(url)
        if (res.status === 429) { setMsg('Dihentikan: terlalu banyak permintaan. Coba lagi beberapa menit lagi.'); setBusy(false); if (onDone) onDone(); return }
        const data = res.ok ? await res.json() : []
        const h = data[0]
        if (h && !TERLALU_UMUM.includes(h.addresstype)) {
          await supabase.from(table).update({ latitude: Number(h.lat), longitude: Number(h.lon), titik_perkiraan: true }).eq('id', r.id)
          ok++
        } else gagal++
      } catch { gagal++ }
      await new Promise((res) => setTimeout(res, 1200))
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
