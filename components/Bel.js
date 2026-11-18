'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IkonBel } from '@/components/Ikon'
import DetailAksi from '@/components/DetailAksi'

// Ikon lonceng + panel pengingat. Item berisi `aksi` membuka detail jadwal; item berisi `href` membuka halaman.
export default function Bel({ items, badge = 0, onOpen, footer, judul = 'Pengingat' }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    const luar = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', esc)
    document.addEventListener('mousedown', luar)
    document.addEventListener('touchstart', luar)
    return () => { document.removeEventListener('keydown', esc); document.removeEventListener('mousedown', luar); document.removeEventListener('touchstart', luar) }
  }, [open])

  function toggle() {
    const buka = !open
    setOpen(buka)
    if (buka && onOpen) onOpen()
  }
  const isi = (it) => (
    <>
      <span className={`lb ${it.k}`}>{it.lb}</span>
      <span className="bel-t"><b>{it.teks}</b>{it.info && <small>{it.info}</small>}</span>
    </>
  )

  return (
    <div className="bel" ref={ref}>
      <button type="button" className="ib" onClick={toggle} aria-expanded={open} aria-label={badge > 0 ? `Pengingat, ${badge} baru` : 'Pengingat'} title="Pengingat">
        <IkonBel />{badge > 0 && <span className="bel-badge">{badge > 9 ? '9+' : badge}</span>}
      </button>
      {open && (
        <div className="bel-panel" role="dialog" aria-label={judul}>
          <div className="bel-h">{judul}</div>
          <div className="bel-list">
            {items.length === 0 && <div className="m" style={{ padding: 14 }}>Tidak ada pengingat saat ini.</div>}
            {items.map((it) => (it.href
              ? <Link key={it.key} href={it.href} className="bel-item" onClick={() => setOpen(false)}>{isi(it)}</Link>
              : <button key={it.key} type="button" className="bel-item" onClick={() => { setDetail(it.aksi); setOpen(false) }}>{isi(it)}</button>))}
          </div>
          {footer}
        </div>
      )}
      {detail && <DetailAksi e={detail} close={() => setDetail(null)} />}
    </div>
  )
}
