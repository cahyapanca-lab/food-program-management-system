'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import JadwalBulan from '@/components/JadwalBulan'

const KOSONG = { tanggal: '', program: 'FFC', kota: '', lokasi: '', sumber_dana: '', pelaksana: 'SR', jejaring: '', jumlah_bantuan: '', satuan: 'porsi', jumlah_pm: '', segmentasi: '', armada: '', pic_driver: '', keterangan: '', selesai: false, publik: true, aset_id: '' }

export default function JadwalPage() {
  const { rows, reload, error } = useTable('jadwal_aksi', { order: 'tanggal' })
  const { rows: aset } = useTable('aset')
  const [edit, setEdit] = useState(null)
  return (
    <>
      <h1>Jadwal Aksi</h1>
      <div className="m">Klik tanggal kosong untuk menambah aksi, klik jadwal untuk mengubah atau menandai terlaksana.</div>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <div className="f" style={{ marginTop: 0 }}><button onClick={() => setEdit({ ...KOSONG })}>+ Tambah jadwal</button></div>
        <JadwalBulan events={rows} onDay={(d) => setEdit({ ...KOSONG, tanggal: d })} onEvent={(e) => setEdit({ ...KOSONG, ...e, aset_id: e.aset_id ?? '' })} />
      </div>
      {edit && <FormJadwal j={edit} aset={aset} close={() => setEdit(null)} reload={reload} />}
    </>
  )
}

function FormJadwal({ j, aset, close, reload }) {
  const [f, setF] = useState(j)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const inp = (k, l, t = 'text') => <label>{l}<input type={t} value={f[k] ?? ''} onChange={set(k)} /></label>
  function pilihAset(e) {
    const a = aset.find((x) => String(x.id) === e.target.value)
    setF({ ...f, aset_id: e.target.value, lokasi: a ? a.nama : f.lokasi, kota: a?.kota || f.kota, jumlah_pm: a?.jumlah_pm ?? f.jumlah_pm, program: a?.program || f.program })
  }
  async function simpan() {
    if (!f.tanggal || !f.lokasi) return setErr('Isi tanggal dan lokasi')
    const { id, ...rest } = f
    for (const k of ['jumlah_bantuan', 'jumlah_pm', 'aset_id']) rest[k] = rest[k] === '' || rest[k] == null ? null : Number(rest[k])
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
      {inp('jumlah_pm', 'Jumlah penerima manfaat', 'number')}{inp('segmentasi', 'Segmentasi PM')}{inp('armada', 'Armada')}{inp('pic_driver', 'PIC / Driver')}{inp('keterangan', 'Keterangan')}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.selesai} onChange={(e) => setF({ ...f, selesai: e.target.checked })} /> Sudah terlaksana</label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.publik} onChange={(e) => setF({ ...f, publik: e.target.checked })} /> Tampilkan di halaman relawan</label>
      {err && <div className="err">{err}</div>}
      <div className="f"><button disabled={busy} onClick={simpan}>Simpan</button><button className="sec" onClick={close}>Batal</button>{f.id && <button className="red" onClick={hapus}>Hapus</button>}</div>
    </div></div>
  )
}
