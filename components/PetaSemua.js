'use client'
import { useEffect, useRef, useState } from 'react'
import { MAPS_KEY, loadGoogleMaps, openUrl } from '@/lib/maps'

const WARNA = { FFC: '#1f7a4d', BUYD: '#d97706' }

// peta Google dengan banyak titik. items: [{id, lat, lng, title, sub, program}]
export default function PetaSemua({ items, height = 380, hint = false }) {
  const el = useRef(null)
  const map = useRef(null)
  const marks = useRef([])
  const itemsRef = useRef(items)
  itemsRef.current = items
  const [err, setErr] = useState('')
  const sig = items.map((i) => `${i.id}:${i.lat},${i.lng}`).join('|')

  useEffect(() => {
    if (!MAPS_KEY) return
    let off = false
    loadGoogleMaps().then((maps) => {
      if (off || !el.current) return
      if (!map.current) {
        map.current = new maps.Map(el.current, { center: { lat: -2.5, lng: 118 }, zoom: 4, mapTypeControl: false, streetViewControl: false })
      }
      marks.current.forEach((m) => m.setMap(null))
      marks.current = []
      const info = new maps.InfoWindow()
      const bounds = new maps.LatLngBounds()
      const list = itemsRef.current
      list.forEach((it) => {
        const pos = { lat: Number(it.lat), lng: Number(it.lng) }
        const m = new maps.Marker({
          position: pos, map: map.current, title: it.title,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: WARNA[it.program] || '#64748b', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 },
        })
        m.addListener('click', () => {
          const box = document.createElement('div')
          box.style.cssText = 'color:#1d2a22;font:13px system-ui;max-width:230px;line-height:1.4'
          const t = document.createElement('b'); t.textContent = it.title; box.appendChild(t)
          if (it.sub) { const s = document.createElement('div'); s.textContent = it.sub; box.appendChild(s) }
          const a = document.createElement('a')
          a.href = openUrl({ lat: it.lat, lng: it.lng }); a.target = '_blank'; a.rel = 'noreferrer'; a.textContent = 'Buka di Google Maps'
          box.appendChild(a)
          info.setContent(box); info.open(map.current, m)
        })
        marks.current.push(m)
        bounds.extend(pos)
      })
      if (list.length > 1) map.current.fitBounds(bounds, 48)
      else if (list.length === 1) { map.current.setCenter({ lat: Number(list[0].lat), lng: Number(list[0].lng) }); map.current.setZoom(14) }
    }).catch((e) => setErr(e.message))
    return () => { off = true }
  }, [sig])

  if (!MAPS_KEY) {
    return hint ? (
      <div className="card m" style={{ marginTop: 0 }}>
        🗺 Peta semua titik membutuhkan API key Google Maps. Isi variabel <b>NEXT_PUBLIC_GOOGLE_MAPS_KEY</b> di Vercel (panduan ada di README). Pratinjau peta per lokasi tetap berfungsi tanpa key.
      </div>
    ) : null
  }
  return (
    <div>
      <div className="m" style={{ marginBottom: 6 }}>
        <span style={{ color: WARNA.FFC }}>●</span> FFC &nbsp;<span style={{ color: WARNA.BUYD }}>●</span> BUYD &nbsp;<span style={{ color: '#64748b' }}>●</span> Belum dikategorikan - {items.length} titik
      </div>
      {err && <div className="err">{err}</div>}
      <div ref={el} style={{ height, borderRadius: 12, background: 'var(--a2)' }} />
      {items.length === 0 && <div className="m" style={{ marginTop: 6 }}>Belum ada data dengan titik lokasi.</div>}
    </div>
  )
}
