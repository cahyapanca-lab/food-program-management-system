'use client'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { uploadFoto } from '@/lib/storage'
import { compressImage, cmp, waLink, TAHUN } from '@/lib/util'
import { openUrl, parseCoords } from '@/lib/maps'
import PetaSemua from '@/components/PetaSemua'
import PetaEmbed from '@/components/PetaEmbed'
import GeoTombol from '@/components/GeoTombol'
import { STATUS_TUGAS } from '@/lib/tugas'
import TombolUnduh from '@/components/TombolUnduh'
import DokumenList from '@/components/DokumenList'
import { excelAset, profilAset, unduhDocx, unduhPaket } from '@/lib/ekspor'

function petaLink(a) {
  if (a.latitude != null && a.longitude != null) return openUrl({ lat: a.latitude, lng: a.longitude })
  if (/^https?:/.test(a.lokasi_maps || '')) return a.lokasi_maps
  return openUrl({ q: `${a.nama} ${a.kota || ''}` })
}

const COLS = [
  ['Selesai', 'sudah_implementasi'], ['Nama aset', 'nama'], ['Kota', 'kota'], ['Cluster', 'cluster'],
  ['Program', 'program'], ['PM', 'jumlah_pm'], ['PIC', 'pic'], ['Telepon', null], ['Status', 'status'], ['Tahun perolehan / pembaruan', 'tahun_aset'],
  ['Maps', null], ['WhatsApp', null], ['', null],
]
const SORTS = [
  ['nama:asc', 'Nama aset: A-Z'], ['nama:desc', 'Nama aset: Z-A'], ['kota:asc', 'Kota: A-Z'], ['kota:desc', 'Kota: Z-A'],
  ['cluster:asc', 'Cluster: A-Z'], ['program:asc', 'Program: A-Z'], ['jumlah_pm:desc', 'Penerima manfaat: terbanyak'],
  ['jumlah_pm:asc', 'Penerima manfaat: tersedikit'], ['tahun_aset:desc', 'Tahun perolehan: terbaru'], ['id:desc', 'Terakhir ditambahkan'],
]

export default function AsetPage() {
  const { rows, reload, error } = useTable('aset')
  const { rows: tugas } = useTable('tugas')
  const [q, setQ] = useState(''); const [fk, setFk] = useState(''); const [fc, setFc] = useState('')
  const [fp, setFp] = useState(''); const [fi, setFi] = useState('')
  const [sort, setSort] = useState('nama:asc')
  const [edit, setEdit] = useState(null)
  const [tampil, setTampil] = useState('tabel')
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
          <button className={tampil === 'tabel' ? '' : 'sec'} onClick={() => setTampil('tabel')}>📋 Tabel</button>
          <button className={tampil === 'peta' ? '' : 'sec'} onClick={() => setTampil('peta')}>🗺 Peta</button>
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
          <TombolUnduh label="⬇ Excel (sesuai filter)" onRun={() => excelAset(list)} />
          <TombolUnduh label="⬇ Excel semua aset" onRun={() => excelAset(rows)} />
        </div>
        <div className="m">Menampilkan {list.length} dari {rows.length} aset. Klik judul kolom untuk mengurutkan.</div>
        {tampil === 'peta' ? (
          <>
            <div className="f">
              <GeoTombol table="aset" rows={rows} query={(a) => `${a.nama}, ${a.kota || ''}, Indonesia`} onDone={reload} />
              <span className="m">{list.filter((a) => a.latitude != null && a.longitude != null).length} dari {list.length} aset (sesuai filter) punya titik lokasi</span>
            </div>
            <PetaSemua height={460} items={list.filter((a) => a.latitude != null && a.longitude != null).map((a) => ({
              id: a.id, lat: a.latitude, lng: a.longitude, title: a.nama, program: a.program,
              sub: `${a.kota || ''}${a.program ? ' - ' + a.program : ''}${a.jumlah_pm ? ' - ' + a.jumlah_pm + ' PM' : ''}${a.titik_perkiraan ? ' - titik perkiraan' : ''}`,
            }))} />
          </>
        ) : (
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
                <td>{a.tahun_aset || '-'}{a.tahun_pembaruan ? ` / ${a.tahun_pembaruan}` : ''}</td>
                <td><a target="_blank" rel="noreferrer" href={petaLink(a)}>Buka</a></td>
                <td>{wa ? <a target="_blank" rel="noopener noreferrer" href={wa}><button type="button">Chat PIC</button></a> : <span className="m">Tidak ada nomor</span>}</td>
                <td><button className="sec" onClick={() => setEdit(a)}>Edit</button></td>
              </tr>)
          })}
            {list.length === 0 && <tr><td colSpan={12} className="m" style={{ textAlign: 'center', padding: 24 }}>Tidak ada aset yang cocok.</td></tr>}
          </tbody></table></div>
        )}
      </div>
      {edit && <EditAset a={edit} close={() => setEdit(null)} reload={reload} tugasTerkait={edit.id ? tugas.filter((t) => t.aset_id === edit.id) : []} />}
    </>
  )
}

function EditAset({ a, close, reload, tugasTerkait = [] }) {
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
  function gps() {
    if (!navigator.geolocation) return setErr('Browser tidak mendukung GPS')
    navigator.geolocation.getCurrentPosition(
      (p) => setF((x) => ({ ...x, latitude: p.coords.latitude, longitude: p.coords.longitude, titik_perkiraan: false })),
      () => setErr('Lokasi tidak bisa diambil, izinkan akses lokasi di browser'),
      { enableHighAccuracy: true, timeout: 15000 })
  }
  async function simpan() {
    if (!f.nama?.trim()) return setErr('Nama aset wajib diisi')
    const { id, dibuat_pada, ...rest } = f
    for (const k of ['jumlah_pm', 'kg_beras_per_hari', 'tahun_aset', 'tahun_pembaruan', 'latitude', 'longitude']) rest[k] = rest[k] === '' || rest[k] == null ? null : Number(rest[k])
    for (const k of ['program', 'status', 'implementasi_terakhir', 'kota', 'cluster', 'pic', 'no_hp', 'lokasi_maps', 'story', 'keterangan', 'alamat', 'pimpinan', 'rekomendasi']) if (!rest[k]) rest[k] = null
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
      {inp('tahun_aset', 'Tahun perolehan aset (tahun aset didapatkan)', 'number')}{inp('tahun_pembaruan', 'Tahun pembaruan aset (terakhir diperbarui)', 'number')}
      <label>Status data<select value={f.status || ''} onChange={set('status')}><option value="">-</option><option value="terbaru">Terbaru</option><option value="perlu_update">Perlu update</option></select></label>
      <label>Link Google Maps<input value={f.lokasi_maps ?? ''} onChange={(e) => { const c = parseCoords(e.target.value); setF({ ...f, lokasi_maps: e.target.value, ...(c ? { latitude: c.lat, longitude: c.lng, titik_perkiraan: false } : {}) }) }} placeholder="tempel link Google Maps" /></label>
      <div className="grid">
        <label>Latitude<input type="number" step="any" value={f.latitude ?? ''} onChange={(e) => setF({ ...f, latitude: e.target.value, titik_perkiraan: false })} /></label>
        <label>Longitude<input type="number" step="any" value={f.longitude ?? ''} onChange={(e) => setF({ ...f, longitude: e.target.value, titik_perkiraan: false })} /></label>
      </div>
      <div className="f"><button type="button" className="sec" onClick={gps}>📍 Ambil titik lokasi saya</button>{f.titik_perkiraan && <span className="m">Titik perkiraan otomatis - periksa di peta lalu simpan</span>}</div>
      <PetaEmbed lat={f.latitude} lng={f.longitude} q={`${f.nama || ''} ${f.kota || ''}`} />
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.sudah_implementasi} onChange={(e) => setF({ ...f, sudah_implementasi: e.target.checked })} /> Sudah terimplementasi</label>
      {inp('implementasi_terakhir', 'Implementasi terakhir', 'date')}
      <label>Story aset<textarea rows={5} value={f.story ?? ''} onChange={set('story')} /></label>
      <label>Rekomendasi / keterangan tambahan (mis. program Ramadhan)<textarea rows={3} value={f.rekomendasi ?? ''} onChange={set('rekomendasi')} /></label>
      <label>Keterangan<textarea rows={2} value={f.keterangan ?? ''} onChange={set('keterangan')} /></label>
      {(f.dokumen_santri || []).length > 0 && (<><label>Dokumen data santri (privat, hanya admin)</label><DokumenList dokumen={f.dokumen_santri} /></>)}
      {tugasTerkait.length > 0 && (<><label>To-do terkait aset ini</label>{tugasTerkait.map((t) => <div className="row" key={t.id}>☑ {t.judul} <span className="m">- {STATUS_TUGAS[t.status]}{t.tenggat ? `, tenggat ${t.tenggat}` : ''}</span></div>)}</>)}
      <label>Foto (maks. 5)</label>
      <div className="thumbs">
        {f.foto_urls.map((u, i) => (
          <div className="thumb" key={u}><img src={u} alt={`foto ${i + 1}`} />
            <button type="button" onClick={() => setF({ ...f, foto_urls: f.foto_urls.filter((x) => x !== u) })} aria-label="Hapus foto">×</button></div>))}
      </div>
      {f.foto_urls.length < 5 && <input type="file" accept="image/*" multiple onChange={tambahFoto} disabled={busy} style={{ marginTop: 8 }} />}
      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      <div className="f"><button disabled={busy} onClick={simpan}>{busy ? 'Memproses…' : 'Simpan'}</button><button className="sec" disabled={busy} onClick={close}>Batal</button></div>
      {f.id && (
        <div className="f">
          <TombolUnduh label="⬇ Profil (Word)" onRun={() => unduhDocx(profilAset(f))} />
          <TombolUnduh label="⬇ Paket ZIP (untuk Google Drive)" onRun={() => unduhPaket(profilAset(f))} />
        </div>
      )}
    </div></div>
  )
}
