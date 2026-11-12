'use client'
import Link from 'next/link'
import { useTable } from '@/lib/useTable'
import { TAHUN, fmt, sum, count, iso, porsiOf, kgOf } from '@/lib/util'
import Bars from '@/components/Bars'
import Donut from '@/components/Donut'

export default function Dashboard() {
  const { rows: aset, error } = useTable('aset')
  const { rows: pgj } = useTable('pengajuan', { order: 'id', asc: false })
  const { rows: jad } = useTable('jadwal_aksi', { order: 'tanggal' })

  const baru = aset.filter((a) => a.tahun_aset === TAHUN || a.dari_pengajuan)
  const impl = aset.filter((a) => a.sudah_implementasi).length
  const menunggu = pgj.filter((p) => p.status === 'baru').length
  const bulan = iso(new Date()).slice(0, 7)
  const jadBulan = jad.filter((j) => j.tanggal.startsWith(bulan))
  const mendatang = jad.filter((j) => !j.selesai && j.tanggal >= iso(new Date())).slice(0, 5)
  const terbaru = [...baru].sort((a, b) => b.id - a.id).slice(0, 6)

  const kpi = [
    ['Total aset', aset.length],
    ['Penerima manfaat', fmt(sum(aset, 'jumlah_pm'))],
    [`Aset baru ${TAHUN}`, baru.length],
    ['Sudah implementasi', `${impl} / ${aset.length}`],
    ['Pengajuan menunggu', menunggu],
    ['Aksi bulan ini', jadBulan.length],
  ]

  return (
    <>
      <h1>Dashboard Program Pangan</h1>
      <div className="m">Ringkasan BUYD &amp; FFC - diperbarui otomatis</div>
      {error && <div className="err">{error}</div>}
      <div className="grid" style={{ marginTop: 14 }}>
        {kpi.map(([n, v]) => <div className="card kpi" key={n}><b>{v}</b><span>{n}</span></div>)}
      </div>

      {menunggu > 0 && (
        <Link href="/admin/pengajuan" className="card block" style={{ borderColor: 'var(--o)' }}>
          🔔 {menunggu} pengajuan aset baru menunggu verifikasi - buka
        </Link>
      )}

      <h2 style={{ marginTop: 22 }}>Infografis Aset Baru {TAHUN}</h2>
      <div className="grid2">
        <div className="card"><h3>Aset baru vs lama</h3><Donut a={baru.length} b={aset.length - baru.length} labelA="Aset baru" labelB="Aset lama" /></div>
        <div className="card"><h3>Aset baru per program</h3><Bars data={count(baru, (a) => a.program || 'Belum dikategorikan')} /></div>
        <div className="card"><h3>Aset baru per cluster</h3><Bars data={count(baru, (a) => a.cluster)} /></div>
        <div className="card"><h3>Aset baru per kota (8 teratas)</h3><Bars data={count(baru, (a) => a.kota).slice(0, 8)} /></div>
      </div>

      <div className="card">
        <h3>Aset baru terbaru</h3>
        {terbaru.length === 0 && <div className="m">Belum ada aset baru.</div>}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
          {terbaru.map((a) => (
            <div className="acard" key={a.id}>
              {a.foto_urls?.[0] ? <img src={a.foto_urls[0]} alt={a.nama} /> : <div className="ph">🏠</div>}
              <div>
                <b>{a.nama}</b>
                <div className="m">{a.kota || '-'} {a.program && <span className={`tag ${a.program}`}>{a.program}</span>}</div>
                <div className="m">{a.jumlah_pm ? `${a.jumlah_pm} penerima manfaat` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ marginTop: 22 }}>Sebaran Seluruh Aset</h2>
      <div className="grid2">
        <div className="card"><h3>Per cluster</h3><Bars data={count(aset, (a) => a.cluster)} /></div>
        <div className="card"><h3>Per kota (10 teratas)</h3><Bars data={count(aset, (a) => a.kota).slice(0, 10)} /></div>
        <div className="card"><h3>Per tahun aset</h3><Bars data={count(aset, (a) => a.tahun_aset || 'Tanpa tahun')} /></div>
      </div>

      <div className="card">
        <div className="f" style={{ justifyContent: 'space-between', margin: 0 }}>
          <h3 style={{ margin: 0 }}>Jadwal aksi bulan ini</h3>
          <Link href="/admin/jadwal">Lihat kalender</Link>
        </div>
        <div className="m">{jadBulan.length} aksi - {fmt(porsiOf(jadBulan))} porsi - {fmt(kgOf(jadBulan))} kg beras - {fmt(sum(jadBulan, 'jumlah_pm'))} penerima manfaat</div>
        {mendatang.length === 0 && <div className="m" style={{ marginTop: 8 }}>Tidak ada aksi mendatang.</div>}
        {mendatang.map((j) => (
          <div className="row" key={j.id}>
            <b style={{ minWidth: 92 }}>{new Date(j.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</b>
            <span className={`tag ${j.program}`}>{j.program}</span> {j.lokasi}
          </div>
        ))}
      </div>
    </>
  )
}
