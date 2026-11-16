'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (n) => Number(n || 0).toLocaleString('id-ID')
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

// Ringkasan angka untuk halaman awal (hanya agregat, tanpa data detail)
export default function StatistikPublik() {
  const [s, setS] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    supabase.rpc('statistik_publik').then(({ data, error }) => {
      if (error) setErr('Ringkasan belum bisa dimuat.')
      else setS(data)
    })
  }, [])
  if (err) return <div className="m" style={{ marginTop: 14 }}>{err}</div>
  if (!s) return null
  const tahun = new Date().getFullYear()
  const bulan = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const pAset = pct(s.aset_implementasi, s.total_aset)
  const pAksi = pct(s.aksi_terlaksana, s.aksi_bulan_ini)
  return (
    <div className="grid" style={{ marginTop: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
      <div className="card kpi" style={{ marginTop: 0 }}><div className="ic">🏠</div><b>{fmt(s.total_aset)}</b><span>Total aset</span></div>
      <div className="card kpi" style={{ marginTop: 0 }}><div className="ic">👥</div><b>{fmt(s.penerima_manfaat)}</b><span>Penerima manfaat</span></div>
      <div className="card kpi" style={{ marginTop: 0 }}><div className="ic">✨</div><b>{fmt(s.aset_baru)}</b><span>Aset baru {tahun}</span></div>
      <div className="card kpi" style={{ marginTop: 0 }}>
        <div className="ic">✅</div><b>{pAset}%</b><span>Aset sudah terimplementasi ({fmt(s.aset_implementasi)}/{fmt(s.total_aset)})</span>
        <div className="pbar"><div style={{ width: `${pAset}%` }} /></div>
      </div>
      <div className="card kpi" style={{ marginTop: 0 }}>
        <div className="ic">🗓</div><b>{pAksi}%</b><span>Aksi {bulan} terlaksana: {fmt(s.aksi_terlaksana)} dari {fmt(s.aksi_bulan_ini)} aksi</span>
        <div className="pbar"><div style={{ width: `${pAksi}%` }} /></div>
      </div>
    </div>
  )
}
