import Link from 'next/link'

export default function Home() {
  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      <h1>Program Pangan</h1>
      <p className="m">Sekolah Relawan - BUYD (Beras Untuk Yatim Dhuafa) &amp; FFC (Free Food Car)</p>
      <Link className="card block" href="/relawan">📝 Ajukan aset baru &amp; lihat jadwal aksi</Link>
      <Link className="card block" href="/admin">🔐 Dashboard admin</Link>
    </div>
  )
}
