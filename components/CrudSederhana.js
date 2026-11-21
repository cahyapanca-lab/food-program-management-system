'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { iso } from '@/lib/util'

// Form tambah + daftar + hapus (+ edit bila bisaEdit) untuk tabel sederhana (kolaborasi, dana, alat, opname)
export default function CrudSederhana({ tabel, judul, fields, kolom, order = 'tanggal', ringkas, catatan, konfirmasi = 'Hapus data ini?', bisaEdit = false }) {
  const { rows, error, reload } = useTable(tabel, { order, asc: false })
  const kosong = () => Object.fromEntries(fields.map((x) => [x.k, x.def ?? (x.t === 'date' ? iso(new Date()) : '')]))
  const [f, setF] = useState(kosong)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [ok, setOk] = useState('')
  const kartu = useRef(null)
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
    const r = editId != null
      ? await supabase.from(tabel).update(row).eq('id', editId).select('id')
      : await supabase.from(tabel).insert(row)
    setBusy(false)
    if (r.error) return setErr(r.error.message)
    if (editId != null && (!r.data || r.data.length === 0)) return setErr('Perubahan tidak tersimpan. Data mungkin sudah dihapus, atau akunmu tidak punya izin.')
    setOk(editId != null ? 'Perubahan tersimpan.' : '')
    setEditId(null); setF(kosong()); reload()
  }
  function mulaiEdit(r) {
    setErr(''); setOk(''); setEditId(r.id)
    setF(Object.fromEntries(fields.map((x) => [x.k, r[x.k] == null ? '' : String(r[x.k])])))
    kartu.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function batalEdit() { setEditId(null); setF(kosong()); setErr(''); setOk('') }
  async function hapus(r) {
    if (!confirm(konfirmasi)) return
    const { error: er } = await supabase.from(tabel).delete().eq('id', r.id)
    if (er) setErr(er.message); else { if (editId === r.id) batalEdit(); reload() }
  }

  return (
    <div className="card" ref={kartu} style={editId != null ? { outline: '2px solid var(--a)' } : undefined}>
      <h2>{judul}{editId != null && <span className="m"> · ✏️ Mengedit data</span>}</h2>
      {catatan && <div className="m">{catatan}</div>}
      <form onSubmit={simpan}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          {fields.map((x) => (
            <label key={x.k} style={x.t === 'textarea' ? { gridColumn: '1/-1' } : undefined}>{x.l}{x.wajib && ' *'}
              {x.t === 'textarea' ? <textarea rows={2} value={f[x.k]} onChange={set(x.k)} />
                : x.t === 'select' ? (
                  <select value={f[x.k]} onChange={set(x.k)}>
                    <option value="">-</option>
                    {f[x.k] && !x.opsi.some((o) => (typeof o === 'string' ? o : o[0]) === f[x.k]) && <option value={f[x.k]}>{f[x.k]}</option>}
                    {x.opsi.map((o) => { const [v, l] = typeof o === 'string' ? [o, o] : o; return <option key={v} value={v}>{l}</option> })}
                  </select>
                ) : <input type={x.t === 'number' ? 'number' : x.t === 'date' ? 'date' : 'text'} min={x.t === 'number' ? 0 : undefined} value={f[x.k]} onChange={set(x.k)} />}
            </label>
          ))}
        </div>
        <div className="f">
          <button disabled={busy}>{busy ? 'Menyimpan…' : editId != null ? 'Simpan perubahan' : '+ Simpan'}</button>
          {editId != null && <button type="button" className="sec" disabled={busy} onClick={batalEdit}>Batal</button>}
        </div>
        {ok && <div className="ok">{ok}</div>}
        {err && <div className="err">{err}</div>}
      </form>
      {error && <div className="err">{error}</div>}
      {ringkas && <div className="m"><b>{ringkas(rows)}</b></div>}
      <div className="sc"><table>
        <thead><tr>{kolom.map((c) => <th key={c.l}>{c.l}</th>)}<th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={kolom.length + 1} className="m">Belum ada data.</td></tr>}
          {rows.slice(0, 200).map((r) => (
            <tr key={r.id} style={editId === r.id ? { background: 'var(--a2)' } : undefined}>
              {kolom.map((c) => <td key={c.l}>{c.f ? c.f(r) : (r[c.k] ?? '-')}</td>)}
              <td style={{ whiteSpace: 'nowrap' }}>{bisaEdit && <><button type="button" className="sec" onClick={() => mulaiEdit(r)}>Edit</button>{' '}</>}<button type="button" className="sec" onClick={() => hapus(r)}>Hapus</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {rows.length > 200 && <div className="m">Menampilkan 200 data terbaru dari {rows.length}.</div>}
    </div>
  )
}
