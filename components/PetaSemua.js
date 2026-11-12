'use client'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import { openUrl } from '@/lib/maps'

const WARNA = { FFC: '#1f7a4d', BUYD: '#d97706' }

// Peta banyak titik: Leaflet + OpenStreetMap (gratis, tanpa API key).
// items: [{id, lat, lng, title, sub, program}]
export default function PetaSemua({ items, height = 380 }) {
  const el = useRef(null)
  const state = useRef({ map: null, layer: null })
  const itemsRef = useRef(items)
  itemsRef.current = items
  const sig = items.map((i) => `${i.id}:${i.lat},${i.lng}`).join('|')

  useEffect(() => {
    let off = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (off || !el.current) return
      const st = state.current
      if (!st.map) {
        st.map = L.map(el.current, { scrollWheelZoom: false }).setView([-2.5, 118], 4)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
        }).addTo(st.map)
        st.layer = L.layerGroup().addTo(st.map)
      }
      st.layer.clearLayers()
      const pts = []
      itemsRef.current.forEach((it) => {
        const ll = [Number(it.lat), Number(it.lng)]
        const m = L.circleMarker(ll, { radius: 8, color: '#ffffff', weight: 2, fillColor: WARNA[it.program] || '#64748b', fillOpacity: 1 })
        const box = document.createElement('div')
        box.style.cssText = 'font:13px system-ui;line-height:1.4;max-width:220px'
        const t = document.createElement('b'); t.textContent = it.title; box.appendChild(t)
        if (it.sub) { const s = document.createElement('div'); s.textContent = it.sub; box.appendChild(s) }
        const a = document.createElement('a')
        a.href = openUrl({ lat: it.lat, lng: it.lng }); a.target = '_blank'; a.rel = 'noreferrer'; a.textContent = 'Buka di Google Maps'
        box.appendChild(a)
        m.bindPopup(box)
        m.addTo(st.layer)
        pts.push(ll)
      })
      if (pts.length > 1) st.map.fitBounds(pts, { padding: [40, 40] })
      else if (pts.length === 1) st.map.setView(pts[0], 14)
    })()
    return () => { off = true }
  }, [sig])

  useEffect(() => () => {
    const st = state.current
    if (st.map) { st.map.remove(); st.map = null; st.layer = null }
  }, [])

  return (
    <div>
      <div className="m" style={{ marginBottom: 6 }}>
        <span style={{ color: WARNA.FFC }}>●</span> FFC &nbsp;<span style={{ color: WARNA.BUYD }}>●</span> BUYD &nbsp;<span style={{ color: '#64748b' }}>●</span> Belum dikategorikan - {items.length} titik
      </div>
      <div ref={el} style={{ height, borderRadius: 12, background: 'var(--a2)', isolation: 'isolate' }} />
      {items.length === 0 && <div className="m" style={{ marginTop: 6 }}>Belum ada data dengan titik lokasi.</div>}
    </div>
  )
}
