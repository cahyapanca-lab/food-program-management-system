'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'

const wktu = (s) => new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const LABEL = { baru: 'Baru', dibaca: 'Sudah dibaca', ditanggapi: 'Ditanggapi' }

function Item({ k, reload }) {
  const [balas, setBalas] = useState(k.balasan || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function ubah(patch) {
    setBusy(true); setErr('')
    const { error } = await supabase.from('komentar_leader').update(patch).eq('id', k.id)
    setBusy(false)
    if (error) setErr(error.message); else reload()
  }
  async function hapus() {
    if (!confirm('Hapus komentar ini?')) return
    setBusy(true); setErr('')
    const { error } = await supabase.from('komentar_leader').delete().eq('id', k.id)
    setBusy(false)
    if (error) setErr(error.message); else reload()
  }
  function kirimBalasan() {
    const teks = balas.trim()
    if (!teks) return setErr('Tulis balasan terlebih dahulu')
    ubah({ balasan: teks, status: 'ditanggapi', dibalas_pada: new Date().toISOString() })
  }

  return (
    <div className="kom">
      <div className="row" style={{ margin: 0 }}>
        <b>{k.leader_nama}</b><span className="m">· {k.leader_email} · {k.bagian}{k.periode ? ` · ${k.periode}` : ''} · {wktu(k.dibuat_pada)}</span>
        <span className="sp" /><span className={`tag ${k.status}`}>{LABEL[k.status] || k.status}</span>
      </div>
      <div className="tx">{k.isi}</div>
      <label>Balasan untuk leaders
        <textarea rows={2} maxLength={2000} value={balas} onChange={(e) => setBalas(e.target.value)} />
      </label>
      <div className="f">
        <button disabled={busy} onClick={kirimBalasan}>{k.balasan ? 'Perbarui balasan' : 'Kirim balasan'}</button>
        {k.status === 'baru' && <button className="sec" disabled={busy} onClick={() => ubah({ status: 'dibaca' })}>Tandai sudah dibaca</button>}
        <button className="sec" disabled={busy} onClick={hapus}>Hapus</button>
      </div>
      {err && <div className="err">{err}</div>}
    </div>
  )
}

export default function KomentarLeaders() {
  const { rows, error, reload } = useTable('komentar_leader', { order: 'id', asc: false })
  const [semua, setSemua] = useState(false)
  const tampil = semua ? rows : rows.filter((k) => k.status !== 'ditanggapi')
  const baru = rows.filter((k) => k.status === 'baru').length

  return (
    <>
      <h1>Komentar Leaders</h1>
      <div className="m">Masukan dari leaders (Manaf, Rani, Umar) yang ditulis di dashboard leaders. Leaders hanya bisa melihat data dan berkomentar; mereka tidak bisa mengubah apa pun.</div>
      {error && <div className="err card">{/komentar_leader/.test(error) ? 'Fitur komentar belum aktif. Jalankan migrasi_v9.sql di Supabase.' : error}</div>}
      <div className="f">
        <button className={semua ? 'sec' : ''} onClick={() => setSemua(false)}>Perlu ditanggapi{baru > 0 && <span className="badge">{baru}</span>}</button>
        <button className={semua ? '' : 'sec'} onClick={() => setSemua(true)}>Semua ({rows.length})</button>
      </div>
      {tampil.length === 0 && !error && <div className="card m">{semua ? 'Belum ada komentar.' : 'Tidak ada komentar yang menunggu tanggapan.'}</div>}
      {tampil.map((k) => <Item key={k.id} k={k} reload={reload} />)}
    </>
  )
}
