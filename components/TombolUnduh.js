'use client'
import { useState } from 'react'

export default function TombolUnduh({ label, onRun, className = 'sec' }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function jalan() {
    setBusy(true); setErr('')
    try { await onRun() } catch (e) { setErr(e.message || 'Gagal') }
    setBusy(false)
  }
  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={jalan}>{busy ? 'Menyiapkan…' : label}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </>
  )
}
