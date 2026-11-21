import Link from 'next/link'
import TopBar from '@/components/TopBar'
import JadwalPublik from '@/components/JadwalPublik'

export default function Home() {
  return (
    <>
      <TopBar masukAdmin masukLeaders />
      <main className="wrap" style={{ maxWidth: 940 }}>
        <section className="hero-home">
          <h1>Program Pangan</h1>
          <p>Sekolah Relawan · Beras Untuk Yatim Dhuafa (BUYD) dan Free Food Car (FFC). Kenal pondok atau panti yang perlu dibantu? Ajukan di sini.</p>
          <Link href="/relawan" className="cta">📝 Ajukan Lokasi Baru</Link>
        </section>
        <section className="card">
          <h2>Jadwal Aksi</h2>
          <JadwalPublik />
        </section>
      </main>
    </>
  )
}
