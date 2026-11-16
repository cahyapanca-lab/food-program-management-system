import Link from 'next/link'
import StatistikPublik from '@/components/StatistikPublik'
import JadwalPublik from '@/components/JadwalPublik'

export default function Home() {
  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <h1>Program Pangan</h1>
      <p className="m">Sekolah Relawan - BUYD (Beras Untuk Yatim Dhuafa) &amp; FFC (Free Food Car)</p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
        <Link className="card block" style={{ marginTop: 0 }} href="/relawan">📝 Ajukan aset baru</Link>
        <Link className="card block" style={{ marginTop: 0 }} href="/admin">🔐 Dashboard admin</Link>
      </div>
      <StatistikPublik />
      <div className="card">
        <h2>Jadwal Aksi</h2>
        <JadwalPublik />
      </div>
    </div>
  )
}
