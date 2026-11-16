'use client'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { iso } from '@/lib/util'
import { STATUS_TUGAS, URUT_STATUS, PRIORITAS, terlambatTugas } from '@/lib/tugas'
import TugasForm from '@/components/TugasForm'

export default function TugasPage() {
  const { rows, reload, error } = useTable('tugas', { order: 'urutan' })
  const { rows: aset } = useTable('aset')
  const { rows: jadwal } = useTable('jadwal_aksi', { order: 'tanggal' })
  const [edit, setEdit] = useState(null)
  const [q, setQ] = useState('')
  const [fpj, setFpj] = useState('')
  const [fpr, setFpr] = useState('')
  const [over, setOver] = useState('')
  const hari = iso(new Date())

  const pj = useMemo(() => [...new Set(rows.map((t) => t.penanggung_jawab).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')), [rows])
  const namaAset = useMemo(() => new Map(aset.map((a) => [a.id, a.nama])), [aset])
  const aksi = useMemo(() => new Map(jadwal.map((j) => [j.id, j])), [jadwal])
  const list = rows.filter((t) =>
    (!q || `${t.judul} ${t.deskripsi || ''} ${t.penanggung_jawab || ''}`.toLowerCase().includes(q.toLowerCase())) &&
    (!fpj || t.penanggung_jawab === fpj) && (!fpr || t.prioritas === fpr))

  async function pindah(t, status) {
    if (t.status === status) return
    const { error } = await supabase.from('tugas').update({ status, urutan: Date.now(), selesai_pada: status === 'selesai' ? new Date().toISOString() : null }).eq('id', t.id)
    if (error) alert(error.message)
    reload()
  }
  function lepas(e, status) {
    e.preventDefault()
    setOver('')
    const t = rows.find((x) => x.id === Number(e.dataTransfer.getData('text/plain')))
    if (t) pindah(t, status)
  }

  return (
    <>
      <h1>To-do</h1>
      <div className="m">Seret kartu antar kolom (di HP gunakan tombol ‹ ›). Terhubung ke Laporan, Jadwal Aksi, dan pengingat di Dashboard.</div>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <div className="f" style={{ margin: 0 }}>
          <input placeholder="Cari to-do" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <select value={fpj} onChange={(e) => setFpj(e.target.value)}><option value="">Semua penanggung jawab</option>{pj.map((n) => <option key={n}>{n}</option>)}</select>
          <select value={fpr} onChange={(e) => setFpr(e.target.value)}><option value="">Semua prioritas</option>{Object.entries(PRIORITAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button onClick={() => setEdit({})}>+ To-do</button>
        </div>
      </div>

      <div className="kanban" style={{ marginTop: 14 }}>
        {URUT_STATUS.map((st, idx) => {
          const kolom = list.filter((t) => t.status === st)
          return (
            <div key={st} className={`kcol${over === st ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(st) }} onDragLeave={() => setOver('')} onDrop={(e) => lepas(e, st)}>
              <h3><span>{STATUS_TUGAS[st]}</span><span className="m">{kolom.length}</span></h3>
              {kolom.map((t) => {
                const telat = terlambatTugas(t, hari)
                const a = t.jadwal_id ? aksi.get(t.jadwal_id) : null
                return (
                  <div key={t.id} className={`kcard${telat ? ' telat' : ''}`} draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', String(t.id))} onClick={() => setEdit(t)}>
                    <span className={`pri ${t.prioritas}`}>{PRIORITAS[t.prioritas]}</span>{' '}
                    {t.tampil_di_jadwal && <span title="Tampil di kalender jadwal aksi">📅</span>}
                    <div style={{ fontWeight: 600, marginTop: 4 }}>{t.judul}</div>
                    <div className="meta">
                      {t.tenggat && <span style={{ color: telat ? 'var(--r)' : undefined, fontWeight: telat ? 700 : 400 }}>⏰ {new Date(t.tenggat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}{telat ? ' (terlambat)' : ''}</span>}
                      {t.penanggung_jawab && <span>👤 {t.penanggung_jawab}</span>}
                      {t.aset_id && namaAset.get(t.aset_id) && <span>🏠 {namaAset.get(t.aset_id)}</span>}
                      {a && <span>🗓 {a.lokasi}</span>}
                    </div>
                    <div className="mv" onClick={(e) => e.stopPropagation()}>
                      <button type="button" disabled={idx === 0} onClick={() => pindah(t, URUT_STATUS[idx - 1])} aria-label="Pindah ke kolom sebelumnya">‹</button>
                      <button type="button" disabled={idx === URUT_STATUS.length - 1} onClick={() => pindah(t, URUT_STATUS[idx + 1])} aria-label="Pindah ke kolom berikutnya">›</button>
                    </div>
                  </div>)
              })}
              {kolom.length === 0 && <div className="m" style={{ padding: 6 }}>Kosong</div>}
            </div>)
        })}
      </div>
      {edit && <TugasForm t={edit} aset={aset} jadwal={jadwal} pj={pj} close={() => setEdit(null)} reload={reload} />}
    </>
  )
}
