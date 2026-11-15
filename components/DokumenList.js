'use client'
import TombolUnduh from '@/components/TombolUnduh'
import { unduhDokumen } from '@/lib/ekspor'

export default function DokumenList({ dokumen }) {
  if (!dokumen || dokumen.length === 0) return null
  return (
    <div className="f" style={{ marginTop: 4 }}>
      {dokumen.map((d) => <TombolUnduh key={d.path} label={`⬇ ${d.nama}`} onRun={() => unduhDokumen(d)} />)}
    </div>
  )
}
