'use client'
import { iso } from '@/lib/util'
import { pengingatAdmin } from '@/lib/pengingat'
import Bel from '@/components/Bel'

export default function BelAdmin({ jadwal, tugas, pengajuan }) {
  const items = pengingatAdmin({ jadwal, tugas, pengajuan, hari: iso(new Date()) })
  return <Bel items={items} badge={items.length} judul="Pengingat admin" />
}
