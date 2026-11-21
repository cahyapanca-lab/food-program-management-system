'use client'
import { useEffect } from 'react'
import PetaEmbed from '@/components/PetaEmbed'
import { IkonTutup } from '@/components/Ikon'
import { statusAksi, STATUS_LABEL, STATUS_IKON } from '@/lib/util'

// Detail satu jadwal aksi (modal). Kolom internal (pelaksana, kendala, relawan, dll) hanya muncul bila datanya ada (PIC).
export default function DetailAksi({ e, close }) {
  useEffect(() => {
    const k = (ev) => { if (ev.key === 'Escape') close() }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [close])
  const s = statusAksi(e)
  const baris = [
    ['Tanggal', new Date(`${e.tanggal}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
    ['Status', `${STATUS_IKON[s]} ${STATUS_LABEL[s]}`],
    ['Kota', e.kota],
    ['Bantuan', e.jumlah_bantuan ? `${Number(e.jumlah_bantuan).toLocaleString('id-ID')} ${e.satuan || ''}` : ''],
    ['Penerima manfaat', e.jumlah_pm ? Number(e.jumlah_pm).toLocaleString('id-ID') : ''],
    ['Segmentasi', e.segmentasi],
    ['Pelaksana', e.pelaksana], ['Jejaring', e.jejaring], ['Sumber dana', e.sumber_dana], ['Armada', e.armada], ['PIC / Driver', e.pic_driver],
    ['Relawan', (e.relawan || []).join(', ')],
    ['Kendala', [e.kendala_kategori, e.kendala_alasan].filter(Boolean).join(' - ')],
    ['Keterangan', e.keterangan],
  ].filter(([, v]) => v)
  return (
    <div className="modal" onClick={close}>
      <div onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Detail jadwal aksi">
        <div className="f" style={{ justifyContent: 'space-between', alignItems: 'flex-start', margin: 0 }}>
          <div>
            <span className={`tag ${e.program}`}>{e.program}</span>
            <h2 style={{ margin: '6px 0 0' }}>{e.lokasi}</h2>
          </div>
          <button type="button" className="ib" onClick={close} aria-label="Tutup"><IkonTutup /></button>
        </div>
        <dl className="dl">
          {baris.map(([k, v]) => (<div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>))}
        </dl>
        <PetaEmbed lat={e.latitude} lng={e.longitude} q={`${e.lokasi} ${e.kota || ''}`} />
      </div>
    </div>
  )
}
