'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { iso } from '@/lib/util'

// Form tambah + daftar + hapus untuk tabel sederhana (kolaborasi, dana, alat, opname)
export default function CrudSederhana({ tabel, judul, fields, kolom, order = 'tanggal', ringkas, catatan, konfirmasi = 'Hapus data ini?' }) {
  const { rows, error, reload } = useTable(tabel, { order, asc: false })
  const kosong = () => Object.fromEntries(fields.map((x) => [x.k, x.def ?? (x.t === 'date' ? iso(new Date()) : '')]))
  const [f, setF] = useState(kosong)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((c) => ({ ...c, [k]: e.target.value }))

  async function simpan(e) {
    e.preventDefault(); setErr('')
    const hilang = fields.find((x) => x.wajib && (f[x.k] === '' || f[x.k] == null))
    if (hilang) return setErr(`${hilang.l} wajib diisi`)
    const row = {}
    for (const x of fields) {
      const v = f[x.k]
      row[x.k] = v === '' || v == null ? null : x.t === 'number' || x.num ? Number(v) : String(v).trim()
    }
    setBusy(true)
    const r = await supabase.from(tabel).insert(row)
    setBusy(false)
    if (r.error) return setErr(r.error.message)
    setF(kosong()); reload()
  }
  async function hapus(r) {
    if (!confirm(konfirmasi)) return
    const { error: er } = await supabase.from(tabel).delete().eq('id', r.id)
    if (er) setErr(er.message); else reload()
  }

  return (
    <div className="card">
      <h2>{judul}</h2>
      {catatan && <div className="m">{catatan}</div>}
      <form onSubmit={simpan}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          {fields.map((x) => (
            <label key={x.k} style={x.t === 'textarea' ? { gridColumn: '1/-1' } : undefined}>{x.l}{x.wajib && ' *'}
              {x.t === 'textarea' ? <textarea rows={2} value={f[x.k]} onChange={set(x.k)} />
                : x.t === 'select' ? (
                  <select value={f[x.k]} onChange={set(x.k)}>
                    <option value="">-</option>
                    {x.opsi.map((o) => { const [v, l] = typeof o === 'string' ? [o, o] : o; return <option key={v} value={v}>{l}</option> })}
                  </select>
                ) : <input type={x.t === 'number' ? 'number' : x.t === 'date' ? 'date' : 'text'} min={x.t === 'number' ? 0 : undefined} value={f[x.k]} onChange={set(x.k)} />}
            </label>
          ))}
        </div>
        <div className="f"><button disabled={busy}>{busy ? 'Menyimpan…' : '+ Simpan'}</button></div>
        {err && <div className="err">{err}</div>}
      </form>
      {error && <div className="err">{error}</div>}
      {ringkas && <div className="m"><b>{ringkas(rows)}</b></div>}
      <div className="sc"><table>
        <thead><tr>{kolom.map((c) => <th key={c.l}>{c.l}</th>)}<th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={kolom.length + 1} className="m">Belum ada data.</td></tr>}
          {rows.slice(0, 200).map((r) => (
            <tr key={r.id}>
              {kolom.map((c) => <td key={c.l}>{c.f ? c.f(r) : (r[c.k] ?? '-')}</td>)}
              <td><button type="button" className="sec" onClick={() => hapus(r)}>Hapus</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {rows.length > 200 && <div className="m">Menampilkan 200 data terbaru dari {rows.length}.</div>}
    </div>
  )
}
