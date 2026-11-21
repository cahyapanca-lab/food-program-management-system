'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { waLink } from '@/lib/util'
import TombolUnduh from '@/components/TombolUnduh'
import DokumenList from '@/components/DokumenList'
import { excelPengajuan, profilPengajuan, unduhDocx, unduhPaket } from '@/lib/ekspor'

export default function PengajuanPage() {
  const { rows, reload, error } = useTable('pengajuan', { order: 'id', asc: false })
  const [filter, setFilter] = useState('baru')
  const [msg, setMsg] = useState('')
  const list = rows.filter((p) => !filter || p.status === filter)

  async function setujui(id) {
    const { error } = await supabase.rpc('setujui_pengajuan', { p_id: id })
    setMsg(error ? (/aset_unik_nama_kota/.test(error.message) ? 'Gagal: aset dengan nama dan kota yang sama sudah ada di Data Aset. Tolak pengajuan ini, atau perbarui aset lama lewat Data Aset.' : 'Gagal: ' + error.message) : 'ok')
    reload()
  }
  async function tolak(id) {
    if (!confirm('Tolak pengajuan ini?')) return
    await supabase.from('pengajuan').update({ status: 'ditolak' }).eq('id', id)
    reload()
  }

  return (
    <>
      <h1>Pengajuan Aset dari Relawan</h1>
      <div className="m">Masuk otomatis dari form relawan. Setelah disetujui, aset muncul di Data Aset dan infografis dashboard.</div>
      {error && <div className="err">{error}</div>}
      <div className="f">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="baru">Menunggu</option><option value="disetujui">Disetujui</option><option value="ditolak">Ditolak</option><option value="">Semua</option>
        </select>
        <span className="m">{list.length} pengajuan</span>
        <TombolUnduh label="⬇ Excel (sesuai filter)" onRun={() => excelPengajuan(list)} />
      </div>
      {msg === 'ok' && <div className="ok">Pengajuan disetujui dan masuk ke <Link href="/pic/aset">Data Aset</Link>.</div>}
      {msg && msg !== 'ok' && <div className="err">{msg}</div>}
      {list.length === 0 && <div className="card m">Tidak ada pengajuan.</div>}
      {list.map((p) => {
        const peta = p.latitude && p.longitude ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}` : p.lokasi_maps
        const wa = waLink(p.no_telp, `Assalamu'alaikum ${p.nama_pengaju}, kami dari Program Pangan Sekolah Relawan. Terima kasih atas pengajuan ${p.nama_pondok}.`)
        return (
          <div className="card" key={p.id}>
            <b>{p.nama_pondok}</b> <span className={`tag ${p.program}`}>{p.program}</span>{' '}
            <span className="m">{p.status} - {new Date(p.dibuat_pada).toLocaleString('id-ID')}</span>
            <div className="m" style={{ marginTop: 6 }}>{p.jenis ? `${p.jenis} - ` : ''}{p.kota} - {p.alamat_pondok}</div>
            <div style={{ marginTop: 6 }}>
              Penghuni: {p.jumlah_penghuni ?? '-'} - Beras: {p.konsumsi_beras_kg ?? '-'} kg/hari - Pimpinan: {p.pimpinan || '-'} - Kategori: {p.kategori || '-'}
            </div>
            {p.story && <p>{p.story}</p>}
            {p.rekomendasi && <p><b>Keterangan / rekomendasi:</b> {p.rekomendasi}</p>}
            {p.foto_urls?.length > 0 && (
              <div className="thumbs">{p.foto_urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="dokumentasi" /></a>)}</div>)}
            {p.dokumen_santri?.length > 0 && (<><div className="m" style={{ marginTop: 8 }}>Dokumen data santri (privat):</div><DokumenList dokumen={p.dokumen_santri} /></>)}
            <div className="m" style={{ marginTop: 8 }}>
              Pengaju: {p.nama_pengaju} ({p.organisasi || '-'}) - {p.alamat_pengaju || ''}
            </div>
            <div className="f">
              {peta && <a href={peta} target="_blank" rel="noreferrer"><button type="button" className="sec">📍 Buka Google Maps</button></a>}
              {wa && <a href={wa} target="_blank" rel="noreferrer"><button type="button" className="sec">💬 WhatsApp pengaju</button></a>}
              <TombolUnduh label="⬇ Word" onRun={() => unduhDocx(profilPengajuan(p))} />
              <TombolUnduh label="⬇ Paket ZIP" onRun={() => unduhPaket(profilPengajuan(p))} />
              {p.status === 'baru' && (<><button onClick={() => setujui(p.id)}>Setujui</button><button className="red" onClick={() => tolak(p.id)}>Tolak</button></>)}
            </div>
          </div>)
      })}
    </>
  )
}
