'use client'
import { useState } from 'react'
import { norm } from '@/lib/relawan'

// input daftar nama (relawan) dengan saran dari nama yang pernah dipakai
export default function ChipsInput({ value, onChange, saran = [] }) {
  const [teks, setTeks] = useState('')
  function tambah(raw) {
    const baru = raw.split(',').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean)
    if (!baru.length) return
    const ada = new Set(value.map(norm))
    const tambahan = []
    baru.forEach((n) => { if (!ada.has(norm(n))) { ada.add(norm(n)); tambahan.push(n) } })
    onChange([...value, ...tambahan])
    setTeks('')
  }
  return (
    <div>
      <div className="chips">
        {value.map((n) => (
          <span className="chip" key={n}>{n}<button type="button" onClick={() => onChange(value.filter((x) => x !== n))} aria-label={`Hapus ${n}`}>×</button></span>
        ))}
      </div>
      <div className="f" style={{ margin: '4px 0' }}>
        <input list="saran-relawan" value={teks} style={{ flex: 1 }} placeholder="Ketik nama relawan lalu Enter"
          onChange={(e) => setTeks(e.target.value)} onBlur={() => tambah(teks)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); tambah(teks) } }} />
        <button type="button" className="sec" onClick={() => tambah(teks)}>Tambah</button>
      </div>
      <datalist id="saran-relawan">{saran.map((n) => <option key={n} value={n} />)}</datalist>
      <div className="m">{value.length} relawan</div>
    </div>
  )
}
