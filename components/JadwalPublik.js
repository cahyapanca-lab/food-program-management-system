'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import JadwalBulan from '@/components/JadwalBulan'
import PengingatAksi from '@/components/PengingatAksi'

// Pengingat + kalender jadwal aksi untuk publik (hanya kolom umum dari jadwal yang ditandai "tampilkan di halaman relawan")
export default function JadwalPublik() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  useEffect(() => {
    supabase.from('jadwal_aksi')
      .select('id,tanggal,program,kota,lokasi,jumlah_bantuan,satuan,jumlah_pm,segmentasi,selesai,latitude,longitude')
      .order('tanggal')
      .then(({ data, error }) => { if (error) setErr('Jadwal belum bisa dimuat: ' + error.message); else setRows(data || []) })
  }, [])
  return (
    <>
      {err && <div className="err">{err}</div>}
      <PengingatAksi events={rows} />
      <div style={{ marginTop: 18 }}><JadwalBulan events={rows} /></div>
    </>
  )
}
