'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import JadwalBulan from '@/components/JadwalBulan'
import PetaEmbed from '@/components/PetaEmbed'
import GeoTombol from '@/components/GeoTombol'
import { parseCoords } from '@/lib/maps'
import ChipsInput from '@/components/ChipsInput'
import { STATUS_LABEL, STATUS_KENDALA, KATEGORI_KENDALA } from '@/lib/util'

const KOSONG = { tanggal: '', program: 'FFC', kota: '', lokasi: '', sumber_dana: '', pelaksana: 'SR', jejaring: '', jumlah_bantuan: '', satuan: 'porsi', jumlah_pm: '', segmentasi: '', armada: '', pic_driver: '', keterangan: '', selesai: false, publik: true, aset_id: '', lokasi_maps: '', latitude: '', longitude: '', status_aksi: 'terjadwal', kendala_kategori: '', kendala_alasan: '', relawan: [] }

export default function JadwalPage() {
  const { rows, reload, error } = useTable('jadwal_aksi', { order: 'tanggal' })
  const { rows: aset } = useTable('aset')
  const [edit, setEdit] = useState(null)
  const kenal = [...new Set(rows.flatMap((r) => r.relawan || []))]
  return (
    <>
      <h1>Jadwal Aksi</h1>
      <div className="m">Klik tanggal kosong untuk menambah aksi, klik jadwal untuk mengubah atau menandai terlaksana.</div>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <div className="f" style={{ marginTop: 0 }}>
          <button onClick={() => setEdit({ ...KOSONG })}>+ Tambah jadwal</button>
          <GeoTombol table="jadwal_aksi" rows={rows} query={(j) => `${j.lokasi}, ${j.kota || ''}, Indonesia`} onDone={reload} />
        </div>
        <JadwalBulan events={rows} onDay={(d) => setEdit({ ...KOSONG, tanggal: d })} onEvent={(e) => setEdit({ ...KOSONG, ...e, aset_id: e.aset_id ?? '' })} />
      </div>
      {edit && <FormJadwal j={edit} aset={aset} kenal={kenal} close={() => setEdit(null)} reload={reload} />}
    </>
  )
}

function FormJadwal({ j, aset, kenal, close, reload }) {
  const [f, setF] = useState(j)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const inp = (k, l, t = 'text') => <label>{l}<input type={t} value={f[k] ?? ''} onChange={set(k)} /></label>
  function pilihAset(e) {
    const a = aset.find((x) => String(x.id) === e.target.value)
    setF({ ...f, aset_id: e.target.value, lokasi: a ? a.nama : f.lokasi, kota: a?.kota || f.kota, jumlah_pm: a?.jumlah_pm ?? f.jumlah_pm, program: a?.program || f.program, latitude: a?.latitude ?? f.latitude, longitude: a?.longitude ?? f.longitude, lokasi_maps: a?.lokasi_maps || f.lokasi_maps })
  }
  function gps() {
    if (!navigator.geolocation) return setErr('Browser tidak mendukung GPS')
    navigator.geolocation.getCurrentPosition(
      (p) => setF((x) => ({ ...x, latitude: p.coords.latitude, longitude: p.coords.longitude, titik_perkiraan: false })),
      () => setErr('Lokasi tidak bisa diambil, izinkan akses lokasi di browser'),
      { enableHighAccuracy: true, timeout: 15000 })
  }
  async function simpan() {
    if (!f.tanggal || !f.lokasi) return setErr('Isi tanggal dan lokasi')
    if (STATUS_KENDALA.includes(f.status_aksi) && !(f.kendala_alasan || '').trim()) return setErr('Isi alasan / kendala untuk status ini')
    const { id, ...rest } = f
    rest.selesai = rest.status_aksi === 'terlaksana'
    rest.kendala_kategori = rest.kendala_kategori || null
    rest.kendala_alasan = (rest.kendala_alasan || '').trim() || null
    rest.relawan = rest.relawan || []
    for (const k of ['jumlah_bantuan', 'jumlah_pm', 'aset_id', 'latitude', 'longitude']) rest[k] = rest[k] === '' || rest[k] == null ? null : Number(rest[k])
    setBusy(true)
    const r = id ? await supabase.from('jadwal_aksi').update(rest).eq('id', id) : await supabase.from('jadwal_aksi').insert(rest)
    setBusy(false)
    if (r.error) return setErr(r.error.message)
    reload(); close()
  }
  async function hapus() {
    if (!confirm('Hapus jadwal ini?')) return
    await supabase.from('jadwal_aksi').delete().eq('id', f.id)
    reload(); close()
  }
  return (
    <div className="modal" onClick={() => !busy && close()}><div onClick={(e) => e.stopPropagation()}>
      <h2>{f.id ? 'Ubah jadwal aksi' : 'Tambah jadwal aksi'}</h2>
      {inp('tanggal', 'Tanggal', 'date')}
      <label>Program<select value={f.program} onChange={(e) => setF({ ...f, program: e.target.value, satuan: e.target.value === 'BUYD' ? 'kg' : 'porsi' })}><option>FFC</option><option>BUYD</option></select></label>
      <label>Ambil dari data aset (opsional)<select value={f.aset_id} onChange={pilihAset}><option value="">-</option>{aset.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}</select></label>
      {inp('kota', 'Kota')}{inp('lokasi', 'Lokasi / nama aset')}{inp('sumber_dana', 'Sumber dana')}
      <label>Pelaksana<select value={f.pelaksana || ''} onChange={set('pelaksana')}><option>SR</option><option>Jejaring</option></select></label>
      {inp('jejaring', 'Nama jejaring')}{inp('jumlah_bantuan', 'Jumlah bantuan', 'number')}
      <label>Satuan<select value={f.satuan || ''} onChange={set('satuan')}><option value="kg">kg</option><option value="porsi">porsi</option></select></label>
      {inp('jumlah_pm', 'Jumlah penerima manfaat', 'number')}{inp('segmentasi', 'Segmentasi PM')}
      <label>Link Google Maps lokasi aksi<input value={f.lokasi_maps ?? ''} onChange={(e) => { const c = parseCoords(e.target.value); setF({ ...f, lokasi_maps: e.target.value, ...(c ? { latitude: c.lat, longitude: c.lng, titik_perkiraan: false } : {}) }) }} placeholder="tempel link Google Maps" /></label>
      <div className="f"><button type="button" className="sec" onClick={gps}>📍 Ambil titik lokasi saya</button>{f.titik_perkiraan && <span className="m">Titik perkiraan otomatis - periksa lalu simpan</span>}</div>
      <PetaEmbed lat={f.latitude} lng={f.longitude} q={`${f.lokasi || ''} ${f.kota || ''}`} />{inp('armada', 'Armada')}{inp('pic_driver', 'PIC / Driver')}{inp('keterangan', 'Keterangan')}
      <label>Status pelaksanaan
        <select value={f.status_aksi || 'terjadwal'} onChange={set('status_aksi')}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label>Kategori kendala / bottleneck (jika ada)
        <select value={f.kendala_kategori || ''} onChange={set('kendala_kategori')}>
          <option value="">-</option>{KATEGORI_KENDALA.map((k) => <option key={k}>{k}</option>)}
        </select>
      </label>
      <label>Alasan / kendala {STATUS_KENDALA.includes(f.status_aksi) && <b className="err">(wajib untuk status ini)</b>}
        <textarea rows={3} value={f.kendala_alasan ?? ''} onChange={set('kendala_alasan')} placeholder="Contoh: armada rusak sehingga distribusi mundur satu hari" />
      </label>
      <label>Relawan yang terlibat</label>
      <ChipsInput value={f.relawan || []} onChange={(v) => setF({ ...f, relawan: v })} saran={kenal} />
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.publik} onChange={(e) => setF({ ...f, publik: e.target.checked })} /> Tampilkan di halaman relawan</label>
      {err && <div className="err">{err}</div>}
      <div className="f"><button disabled={busy} onClick={simpan}>Simpan</button><button className="sec" onClick={close}>Batal</button>{f.id && <button className="red" onClick={hapus}>Hapus</button>}</div>
    </div></div>
  )
}
