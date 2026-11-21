'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { fmt, iso, sum } from '@/lib/util'

// Form tambah + daftar + hapus (+ edit bila bisaEdit) untuk tabel sederhana (kolaborasi, dana, alat, opname)
export default function CrudSederhana({ tabel, judul, fields, kolom, order = 'tanggal', ringkas, catatan, konfirmasi = 'Hapus data ini?', bisaEdit = false, pilahProgram = false, totalKey = 'jumlah' }) {
  const { rows, error, reload } = useTable(tabel, { order, asc: false })
  const kosong = () => Object.fromEntries(fields.map((x) => [x.k, x.def ?? (x.t === 'date' ? iso(new Date()) : '')]))
  const [f, setF] = useState(kosong)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [ok, setOk] = useState('')
  const [fp, setFp] = useState('')
  const [urut, setUrut] = useState('terbaru')
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

  const cocok = (r, v) => (v === '' ? true : v === '_kosong' ? !r.program : r.program === v)
  let baris = pilahProgram ? rows.filter((r) => cocok(r, fp)) : rows
  if (pilahProgram && urut === 'terbesar') baris = [...baris].sort((p, q) => Number(q[totalKey] || 0) - Number(p[totalKey] || 0))
  if (pilahProgram && urut === 'terkecil') baris = [...baris].sort((p, q) => Number(p[totalKey] || 0) - Number(q[totalKey] || 0))
  const adaTanpa = rows.some((r) => !r.program)

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
      {pilahProgram && (
        <>
          <div className="f" style={{ marginBottom: 4 }}>
            {[['', 'Semua'], ['FFC', 'FFC'], ['BUYD', 'BUYD'], ['Umum', 'Umum'], ...(adaTanpa ? [['_kosong', 'Tanpa program']] : [])].map(([v, l]) => (
              <button key={v || 'semua'} type="button" className={fp === v ? '' : 'sec'} onClick={() => setFp(v)}>{l} ({rows.filter((r) => cocok(r, v)).length})</button>
            ))}
            <select value={urut} onChange={(e) => setUrut(e.target.value)} aria-label="Urutkan">
              <option value="terbaru">Urut: tanggal terbaru</option><option value="terbesar">Urut: jumlah terbesar</option><option value="terkecil">Urut: jumlah terkecil</option>
            </select>
          </div>
          <div className="m">Total per program: {['FFC', 'BUYD', 'Umum'].map((k) => `${k} Rp ${fmt(sum(rows.filter((r) => r.program === k), totalKey))}`).join(' · ')}{adaTanpa ? ` · Tanpa program Rp ${fmt(sum(rows.filter((r) => !r.program), totalKey))}` : ''}</div>
        </>
      )}
      {ringkas && <div className="m"><b>{ringkas(baris, fp)}</b></div>}
      <div className="sc"><table>
        <thead><tr>{kolom.map((c) => <th key={c.l}>{c.l}</th>)}<th /></tr></thead>
        <tbody>
          {baris.length === 0 && <tr><td colSpan={kolom.length + 1} className="m">{rows.length === 0 ? 'Belum ada data.' : 'Tidak ada data untuk pilihan ini.'}</td></tr>}
          {baris.slice(0, 200).map((r) => (
            <tr key={r.id} style={editId === r.id ? { background: 'var(--a2)' } : undefined}>
              {kolom.map((c) => <td key={c.l}>{c.f ? c.f(r) : (r[c.k] ?? '-')}</td>)}
              <td style={{ whiteSpace: 'nowrap' }}>{bisaEdit && <><button type="button" className="sec" onClick={() => mulaiEdit(r)}>Edit</button>{' '}</>}<button type="button" className="sec" onClick={() => hapus(r)}>Hapus</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {baris.length > 200 && <div className="m">Menampilkan 200 data teratas dari {baris.length}.</div>}
    </div>
  )
}
