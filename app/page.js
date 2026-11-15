'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import JadwalBulan from '@/components/JadwalBulan'

export default function Home() {
  const [jadwal, setJadwal] = useState([])

  useEffect(() => {
    supabase.from('jadwal_aksi')
      .select('id,tanggal,program,kota,lokasi,jumlah_bantuan,satuan,jumlah_pm,segmentasi,selesai,latitude,longitude')
      .order('tanggal').then(({ data }) => setJadwal(data || []))
  }, [])

  return (
    <div className="wrap" style={{ maxWidth: 960 }}>
      <h1>Program Pangan</h1>
      <p className="m">Sekolah Relawan - BUYD (Beras Untuk Yatim Dhuafa) &amp; FFC (Free Food Car)</p>
      <div className="aksi">
        <Link className="tbl utama" href="/relawan">Ajukan aset baru</Link>
        <Link className="tbl" href="/admin">Dashboard admin</Link>
      </div>

      <div className="card">
        <h2>Jadwal Aksi</h2>
        <JadwalBulan events={jadwal} />
      </div>
    </div>
  )
}
