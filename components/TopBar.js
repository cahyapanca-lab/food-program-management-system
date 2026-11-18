import Link from 'next/link'
import BelPengingat from '@/components/BelPengingat'
import { IkonKembali } from '@/components/Ikon'

// Bilah atas halaman publik: kembali / nama program, tombol masuk admin (opsional), dan lonceng pengingat
export default function TopBar({ kembali = false, masukAdmin = false }) {
  return (
    <header className="topbar">
      <div className="tb-in">
        {kembali && <Link href="/" className="ib" aria-label="Kembali ke halaman awal" title="Halaman awal"><IkonKembali /></Link>}
        <Link href="/" className="brand-t">🌾 Program Pangan</Link>
        <span className="sp" />
        {masukAdmin && <Link href="/admin" className="btn-line">Masuk admin</Link>}
        <BelPengingat />
      </div>
    </header>
  )
}
