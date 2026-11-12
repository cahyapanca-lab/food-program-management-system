'use client'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { uploadFoto } from '@/lib/storage'
import { compressImage, cmp, waLink, TAHUN } from '@/lib/util'

const COLS = [
  ['Selesai', 'sudah_implementasi'], ['Nama aset', 'nama'], ['Kota', 'kota'], ['Cluster', 'cluster'],
  ['Program', 'program'], ['PM', 'jumlah_pm'], ['PIC', 'pic'], ['Telepon', null], ['Status', 'status'],
  ['Maps', null], ['WhatsApp', null], ['', null],
]
const SORTS = [
  ['nama:asc', 'Nama aset: A-Z'], ['nama:desc', 'Nama aset: Z-A'], ['kota:asc', 'Kota: A-Z'], ['kota:desc', 'Kota: Z-A'],
  ['cluster:asc', 'Cluster: A-Z'], ['program:asc', 'Program: A-Z'], ['jumlah_pm:desc', 'Penerima manfaat: terbanyak'],
  ['jumlah_pm:asc', 'Penerima manfaat: tersedikit'], ['tahun_aset:desc', 'Tahun aset: terbaru'], ['id:desc', 'Terakhir ditambahkan'],
]

export default function AsetPage() {
  const { rows, reload, error } = useTable('aset')
  const [q, setQ] = useState(''); const [fk, setFk] = useState(''); const [fc, setFc] = useState('')
  const [fp, setFp] = useState(''); const [fi, setFi] = useState('')
  const [sort, setSort] = useState('nama:asc')
  const [edit, setEdit] = useState(null)
  const [key, dir] = sort.split(':')

  const uniq = (k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'))
  const kotas = useMemo(() => uniq('kota'), [rows])
  const clusters = useMemo(() => uniq('cluster'), [rows])

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return rows
      .filter((a) =>
        (!kw || `${a.nama} ${a.kota} ${a.cluster} ${a.pic} ${a.no_hp}`.toLowerCase().includes(kw)) &&
        (!fk || a.kota === fk) && (!fc || a.cluster === fc) &&
        (!fp || (fp === '-' ? !a.program : a.program === fp)) &&
        (fi === '' || String(a.sudah_implementasi) === fi))
      .sort((a, b) => cmp(a, b, key, dir) || a.id - b.id)
  }, [rows, q, fk, fc, fp, fi, key, dir])

  function klikKolom(k) {
    if (!k) return
    setSort(k === key ? `${k}:${dir === 'asc' ? 'desc' : 'asc'}` : `${k}:${k === 'jumlah_pm' ? 'desc' : 'asc'}`)
  }
  async function centang(a, v) {
    await supabase.from('aset').update({ sudah_implementasi: v, implementasi_terakhir: v ? new Date().toISOString().slice(0, 10) : null }).eq('id', a.id)
    reload()
  }
  const reset = () => { setQ(''); setFk(''); setFc(''); setFp(''); setFi(''); setSort('nama:asc') }

  return (
    <>
      <h1>Data Aset</h1>
      <div className="m">Cari, urutkan, edit, dan hubungi PIC langsung lewat WhatsApp</div>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <div className="f">
          <input placeholder="Cari nama aset / kota / PIC / nomor" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <button onClick={() => setEdit({ nama: '', tahun_aset: TAHUN, status: 'terbaru', foto_urls: [], sudah_implementasi: false })}>+ Aset</button>
        </div>
        <div className="f">
          <select value={fk} onChange={(e) => setFk(e.target.value)}><option value="">Semua kota</option>{kotas.map((k) => <option key={k}>{k}</option>)}</select>
          <select value={fc} onChange={(e) => setFc(e.target.value)}><option value="">Semua cluster</option>{clusters.map((k) => <option key={k}>{k}</option>)}</select>
          <select value={fp} onChange={(e) => setFp(e.target.value)}><option value="">Semua program</option><option>FFC</option><option>BUYD</option><option value="-">Belum dikategorikan</option></select>
          <select value={fi} onChange={(e) => setFi(e.target.value)}><option value="">Semua status implementasi</option><option value="true">Sudah implementasi</option><option value="false">Belum implementasi</option></select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Urutkan berdasarkan">
            {SORTS.map(([v, l]) => <option key={v} value={v}>Urutkan: {l}</option>)}
            {!SORTS.some(([v]) => v === sort) && <option value={sort}>Urutan kolom: {key} {dir === 'asc' ? '↑' : '↓'}</option>}
          </select>
          <button className="sec" onClick={reset}>Reset</button>
        </div>
        <div className="m">Menampilkan {list.length} dari {rows.length} aset. Klik judul kolom untuk mengurutkan.</div>
        <div className="sc"><table>
          <thead><tr>{COLS.map(([l, k]) => (
            <th key={l || 'aksi'} className={k ? 's' : ''} onClick={() => klikKolom(k)}>{l}{k && k === key ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>))}</tr></thead>
          <tbody>{list.map((a) => {
            const wa = waLink(a.no_hp, `Assalamu'alaikum ${a.pic || ''}, kami dari Program Pangan Sekolah Relawan. Kami ingin berkoordinasi terkait ${a.nama}.`)
            return (
              <tr key={a.id}>
                <td><input type="checkbox" checked={!!a.sudah_implementasi} onChange={(e) => centang(a, e.target.checked)} aria-label="Sudah implementasi" /></td>
                <td>{a.nama}{a.dari_pengajuan && <span className="badge">baru</span>}</td>
                <td>{a.kota}</td><td>{a.cluster}</td>
                <td>{a.program ? <span className={`tag ${a.program}`}>{a.program}</span> : '-'}</td>
                <td>{a.jumlah_pm ?? '-'}</td><td>{a.pic || '-'}</td><td>{a.no_hp || '-'}</td>
                <td>{a.status === 'perlu_update' ? 'Perlu update' : a.status === 'terbaru' ? 'Terbaru' : '-'}</td>
                <td>{(a.latitude && a.longitude) ? <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}>Buka</a> : /^https?:/.test(a.lokasi_maps || '') ? <a target="_blank" rel="noreferrer" href={a.lokasi_maps}>Buka</a> : '-'}</td>
                <td>{wa ? <a target="_blank" rel="noopener noreferrer" href={wa}><button type="button">Chat PIC</button></a> : <span className="m">Tidak ada nomor</span>}</td>
                <td><button className="sec" onClick={() => setEdit(a)}>Edit</button></td>
              </tr>)
          })}
            {list.length === 0 && <tr><td colSpan={12} className="m" style={{ textAlign: 'center', padding: 24 }}>Tidak ada aset yang cocok.</td></tr>}
          </tbody></table></div>
      </div>
      {edit && <EditAset a={edit} close={() => setEdit(null)} reload={reload} />}
    </>
  )
}

function EditAset({ a, close, reload }) {
  const [f, setF] = useState({ ...a, foto_urls: a.foto_urls || [] })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const inp = (k, l, t = 'text') => <label>{l}<input type={t} value={f[k] ?? ''} onChange={set(k)} /></label>

  async function tambahFoto(e) {
    const files = [...e.target.files].slice(0, 5 - f.foto_urls.length)
    if (!files.length) return
    setBusy(true); setErr('')
    try {
      const urls = []
      for (const file of files) urls.push(await uploadFoto('aset', await compressImage(file)))
      setF((x) => ({ ...x, foto_urls: [...x.foto_urls, ...urls] }))
    } catch (er) { setErr('Gagal mengunggah foto: ' + er.message) }
    setBusy(false)
    e.target.value = ''
  }
  async function simpan() {
    if (!f.nama?.trim()) return setErr('Nama aset wajib diisi')
    const { id, dibuat_pada, ...rest } = f
    for (const k of ['jumlah_pm', 'kg_beras_per_hari', 'tahun_aset', 'latitude', 'longitude']) rest[k] = rest[k] === '' || rest[k] == null ? null : Number(rest[k])
    for (const k of ['program', 'status', 'implementasi_terakhir', 'kota', 'cluster', 'pic', 'no_hp', 'lokasi_maps', 'story', 'keterangan', 'alamat', 'pimpinan']) if (!rest[k]) rest[k] = null
    setBusy(true)
    const r = id ? await supabase.from('aset').update(rest).eq('id', id) : await supabase.from('aset').insert(rest)
    setBusy(false)
    if (r.error) return setErr(r.error.message)
    reload(); close()
  }
  return (
    <div className="modal" onClick={() => !busy && close()}><div onClick={(e) => e.stopPropagation()}>
      <h2>{a.id ? 'Edit aset' : 'Tambah aset'}</h2>
      {inp('nama', 'Nama pondok / panti / lokasi')}{inp('kota', 'Kota')}{inp('cluster', 'Cluster (jenis aset)')}{inp('alamat', 'Alamat lengkap')}
      {inp('jumlah_pm', 'Jumlah penerima manfaat', 'number')}{inp('kg_beras_per_hari', 'Konsumsi beras (kg / hari)', 'number')}
      {inp('pic', 'Nama PIC')}{inp('no_hp', 'No. WhatsApp PIC (08… atau 62…)')}{inp('pimpinan', 'Pimpinan')}
      <label>Program<select value={f.program || ''} onChange={set('program')}><option value="">-</option><option>FFC</option><option>BUYD</option></select></label>
      {inp('tahun_aset', 'Tahun aset', 'number')}
      <label>Status data<select value={f.status || ''} onChange={set('status')}><option value="">-</option><option value="terbaru">Terbaru</option><option value="perlu_update">Perlu update</option></select></label>
      {inp('lokasi_maps', 'Link Google Maps')}{inp('latitude', 'Latitude', 'number')}{inp('longitude', 'Longitude', 'number')}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.sudah_implementasi} onChange={(e) => setF({ ...f, sudah_implementasi: e.target.checked })} /> Sudah terimplementasi</label>
      {inp('implementasi_terakhir', 'Implementasi terakhir', 'date')}
      <label>Story aset<textarea rows={5} value={f.story ?? ''} onChange={set('story')} /></label>
      <label>Keterangan<textarea rows={2} value={f.keterangan ?? ''} onChange={set('keterangan')} /></label>
      <label>Foto (maks. 5)</label>
      <div className="thumbs">
        {f.foto_urls.map((u, i) => (
          <div className="thumb" key={u}><img src={u} alt={`foto ${i + 1}`} />
            <button type="button" onClick={() => setF({ ...f, foto_urls: f.foto_urls.filter((x) => x !== u) })} aria-label="Hapus foto">×</button></div>))}
      </div>
      {f.foto_urls.length < 5 && <input type="file" accept="image/*" multiple onChange={tambahFoto} disabled={busy} style={{ marginTop: 8 }} />}
      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      <div className="f"><button disabled={busy} onClick={simpan}>{busy ? 'Memproses…' : 'Simpan'}</button><button className="sec" disabled={busy} onClick={close}>Batal</button></div>
    </div></div>
  )
}
