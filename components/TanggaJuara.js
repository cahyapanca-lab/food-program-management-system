'use client'
import { useMemo, useState } from 'react'
import { rekapRelawan, ucapan, namaBulan } from '@/lib/relawan'

const MEDALI = ['🥇', '🥈', '🥉']
const TINGGI = [130, 100, 76]
const WARNA = ['#d4a017', '#94a3b8', '#b45309']

// tangga juara relawan teraktif per bulan (dihitung dari aksi berstatus Terlaksana)
export default function TanggaJuara({ jadwal }) {
  const [bulan, setBulan] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const key = `${bulan.getFullYear()}-${String(bulan.getMonth() + 1).padStart(2, '0')}`
  const label = namaBulan(bulan)
  const rank = useMemo(() => rekapRelawan(jadwal, key, true), [jadwal, key])
  const podium = rank.slice(0, 3)
  const urut = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium.length === 2 ? [podium[1], podium[0]] : podium
  const pemenang = rank.filter((r) => r.rank <= 3)
  const geser = (n) => setBulan(new Date(bulan.getFullYear(), bulan.getMonth() + n, 1))

  return (
    <div>
      <div className="f" style={{ justifyContent: 'space-between', margin: '0 0 8px' }}>
        <h3 style={{ margin: 0, textTransform: 'capitalize' }}>Relawan teraktif - {label}</h3>
        <div className="f" style={{ margin: 0 }}>
          <button className="sec" onClick={() => geser(-1)} aria-label="Bulan sebelumnya">‹</button>
          <button className="sec" onClick={() => geser(1)} aria-label="Bulan berikutnya">›</button>
        </div>
      </div>
      {podium.length === 0 ? (
        <div className="m">Belum ada relawan tercatat pada aksi yang berstatus Terlaksana di bulan ini. Isi nama relawan di Jadwal Aksi, lalu tandai aksinya Terlaksana.</div>
      ) : (
        <>
          <div className="podium">
            {urut.map((r) => {
              const i = podium.indexOf(r)
              return (
                <div className="step" key={r.key}>
                  <div className="who">{MEDALI[i]} {r.nama}</div>
                  <div className="blk" style={{ height: TINGGI[i], background: WARNA[i] }}>#{r.rank}<br /><small>{r.jumlah} aksi</small></div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 12 }}>
            {pemenang.map((r) => <p key={r.key} style={{ margin: '6px 0' }}>🎉 {ucapan({ nama: r.nama, rank: r.rank, bulan: label })}</p>)}
          </div>
        </>
      )}
      <div className="m" style={{ marginTop: 6 }}>Dihitung dari jumlah aksi berstatus Terlaksana yang diikuti.</div>
    </div>
  )
}
