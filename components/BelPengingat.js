'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { iso } from '@/lib/util'
import { pengingatPublik } from '@/lib/pengingat'
import Bel from '@/components/Bel'
import LanggananKalender from '@/components/LanggananKalender'

const KUNCI = 'fpms_pengingat_dilihat'

// Lonceng pengingat jadwal aksi untuk halaman publik (awal dan relawan)
export default function BelPengingat() {
  const [rows, setRows] = useState([])
  const [dilihat, setDilihat] = useState([])
  useEffect(() => {
    supabase.from('jadwal_aksi')
      .select('id,tanggal,program,kota,lokasi,jumlah_bantuan,satuan,jumlah_pm,segmentasi,selesai,latitude,longitude')
      .order('tanggal').then(({ data }) => setRows(data || []))
    try { setDilihat(JSON.parse(localStorage.getItem(KUNCI) || '[]')) } catch { /* abaikan */ }
  }, [])
  const items = pengingatPublik(rows, iso(new Date()))
  const baru = items.filter((i) => !dilihat.includes(i.key)).length
  function dibuka() {
    const semua = [...new Set([...dilihat, ...items.map((i) => i.key)])]
    setDilihat(semua)
    try { localStorage.setItem(KUNCI, JSON.stringify(semua.slice(-200))) } catch { /* abaikan */ }
  }
  return <Bel items={items} badge={baru} onOpen={dibuka} judul="Pengingat aksi 7 hari ke depan" footer={<LanggananKalender />} />
}
