'use client'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STATUS_TUGAS, URUT_STATUS, PRIORITAS } from '@/lib/tugas'

// Form tambah / ubah to-do. Dipakai di papan To-do dan di kalender Jadwal Aksi.
export default function TugasForm({ t, aset = [], jadwal = [], pj = [], close, reload }) {
  const [f, setF] = useState({ judul: '', deskripsi: '', status: 'todo', prioritas: 'sedang', tenggat: '', penanggung_jawab: '', aset_id: '', jadwal_id: '', tampil_di_jadwal: false, ...t })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const aksiUrut = useMemo(() => [...jadwal].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 150), [jadwal])

  function pilihAksi(e) {
    const j = jadwal.find((x) => String(x.id) === e.target.value)
    setF({ ...f, jadwal_id: e.target.value, tenggat: f.tenggat || (j ? j.tanggal : '') })
  }
  async function simpan() {
    if (!(f.judul || '').trim()) return setErr('Judul wajib diisi')
    if (f.tampil_di_jadwal && !f.tenggat) return setErr('Isi tenggat agar bisa tampil di kalender jadwal aksi')
    const { id, dibuat_pada, ...rest } = f
    rest.judul = rest.judul.trim()
    rest.aset_id = rest.aset_id === '' || rest.aset_id == null ? null : Number(rest.aset_id)
    rest.jadwal_id = rest.jadwal_id === '' || rest.jadwal_id == null ? null : Number(rest.jadwal_id)
    rest.tenggat = rest.tenggat || null
    rest.deskripsi = (rest.deskripsi || '').trim() || null
    rest.penanggung_jawab = (rest.penanggung_jawab || '').trim() || null
    if (rest.status === 'selesai') rest.selesai_pada = f.selesai_pada || new Date().toISOString()
    else rest.selesai_pada = null
    if (!id) rest.urutan = Date.now()
    setBusy(true)
    const r = id ? await supabase.from('tugas').update(rest).eq('id', id) : await supabase.from('tugas').insert(rest)
    setBusy(false)
    if (r.error) return setErr(r.error.message)
    reload(); close()
  }
  async function hapus() {
    if (!confirm('Hapus to-do ini?')) return
    await supabase.from('tugas').delete().eq('id', f.id)
    reload(); close()
  }

  return (
    <div className="modal" onClick={() => !busy && close()}><div onClick={(e) => e.stopPropagation()}>
      <h2>{f.id ? 'Ubah to-do' : 'Tambah to-do'}</h2>
      <label>Judul<input value={f.judul} onChange={set('judul')} maxLength={200} autoFocus /></label>
      <label>Deskripsi<textarea rows={3} value={f.deskripsi ?? ''} onChange={set('deskripsi')} /></label>
      <div className="grid">
        <label>Status<select value={f.status} onChange={set('status')}>{URUT_STATUS.map((k) => <option key={k} value={k}>{STATUS_TUGAS[k]}</option>)}</select></label>
        <label>Prioritas<select value={f.prioritas} onChange={set('prioritas')}>{Object.entries(PRIORITAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>Tenggat<input type="date" value={f.tenggat ?? ''} onChange={set('tenggat')} /></label>
      </div>
      <label>Penanggung jawab<input list="daftar-pj" value={f.penanggung_jawab ?? ''} onChange={set('penanggung_jawab')} placeholder="nama" /></label>
      <datalist id="daftar-pj">{pj.map((n) => <option key={n} value={n} />)}</datalist>
      <label>Terkait aset (opsional)
        <select value={f.aset_id ?? ''} onChange={set('aset_id')}><option value="">-</option>{aset.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}</select>
      </label>
      <label>Terkait jadwal aksi (opsional)
        <select value={f.jadwal_id ?? ''} onChange={pilihAksi}><option value="">-</option>{aksiUrut.map((j) => <option key={j.id} value={j.id}>{j.tanggal} - {j.lokasi}</option>)}</select>
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={!!f.tampil_di_jadwal} onChange={(e) => setF({ ...f, tampil_di_jadwal: e.target.checked })} /> Tampilkan di kalender Jadwal Aksi (PIC, pada tanggal tenggat)
      </label>
      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      <div className="f"><button disabled={busy} onClick={simpan}>{busy ? 'Menyimpan…' : 'Simpan'}</button><button className="sec" onClick={close}>Batal</button>{f.id && <button className="red" onClick={hapus}>Hapus</button>}</div>
    </div></div>
  )
}
