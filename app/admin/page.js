'use client'
import Link from 'next/link'
import { useTable } from '@/lib/useTable'
import { TAHUN, fmt, sum, count, iso, porsiOf, kgOf, statusAksi } from '@/lib/util'
import { terlambatTugas, STATUS_TUGAS, URUT_STATUS } from '@/lib/tugas'
import Bars from '@/components/Bars'
import Donut from '@/components/Donut'
import PetaSemua from '@/components/PetaSemua'
import KartuRingkasan from '@/components/KartuRingkasan'

export default function Dashboard() {
  const { rows: aset, error } = useTable('aset')
  const { rows: pgj } = useTable('pengajuan', { order: 'id', asc: false })
  const { rows: jad } = useTable('jadwal_aksi', { order: 'tanggal' })
  const { rows: tugas } = useTable('tugas', { order: 'tenggat' })

  const baru = aset.filter((a) => a.tahun_aset === TAHUN || a.dari_pengajuan)
  const menunggu = pgj.filter((p) => p.status === 'baru').length
  const hari = iso(new Date())
  const jadBulan = jad.filter((j) => j.tanggal.startsWith(hari.slice(0, 7)))
  const mendatang = jad.filter((j) => statusAksi(j) === 'terjadwal' && j.tanggal >= hari).slice(0, 5)
  const terbaru = [...baru].sort((a, b) => b.id - a.id).slice(0, 6)
  const titik = aset.filter((a) => a.latitude != null && a.longitude != null)

  const perStatus = URUT_STATUS.map((s) => [STATUS_TUGAS[s], tugas.filter((t) => t.status === s).length])

  return (
    <>
      <div className="hero">
        <div>
          <h1>Program Pangan</h1>
          <div>Sekolah Relawan - BUYD &amp; FFC</div>
          <div className="hd">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="f" style={{ margin: 0 }}>
          {menunggu > 0 && <Link href="/admin/pengajuan"><button>🔔 {menunggu} pengajuan baru</button></Link>}
        </div>
      </div>
      {error && <div className="err">{error}</div>}

      <KartuRingkasan totalAset={aset.length} pm={sum(aset, 'jumlah_pm')} asetBaru={baru.length}
        asetImpl={aset.filter((a) => a.sudah_implementasi).length} aksiBulan={jadBulan.length}
        aksiTerlaksana={jadBulan.filter((j) => statusAksi(j) === 'terlaksana').length} />

      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="f" style={{ justifyContent: 'space-between', margin: 0 }}><h3 style={{ margin: 0 }}>☑ To-do</h3><Link href="/admin/tugas">Buka papan</Link></div>
          <div className="grid" style={{ marginTop: 10, gridTemplateColumns: 'repeat(2,1fr)' }}>
            {perStatus.map(([n, v]) => <div className="card kpi" style={{ marginTop: 0, padding: 10 }} key={n}><b style={{ fontSize: 22 }}>{v}</b><span>{n}</span></div>)}
          </div>
          <div className="m" style={{ marginTop: 8 }}>{tugas.filter((t) => terlambatTugas(t, hari)).length} to-do terlambat</div>
        </div>
        <div className="card">
          <div className="f" style={{ justifyContent: 'space-between', margin: 0 }}><h3 style={{ margin: 0 }}>🗓 Aksi mendatang</h3><Link href="/admin/jadwal">Buka kalender</Link></div>
          <div className="m">Bulan ini: {jadBulan.length} aksi · {fmt(porsiOf(jadBulan))} porsi · {fmt(kgOf(jadBulan))} kg beras · {fmt(sum(jadBulan, 'jumlah_pm'))} penerima manfaat</div>
          {mendatang.length === 0 && <div className="m" style={{ marginTop: 8 }}>Tidak ada aksi mendatang.</div>}
          {mendatang.map((j) => {
            const d = new Date(j.tanggal)
            return (
              <div className="acard" key={j.id} style={{ marginTop: 10 }}>
                <div className="dbadge"><b>{d.getDate()}</b><small>{d.toLocaleDateString('id-ID', { month: 'short' })}</small></div>
                <div><b>{j.lokasi}</b> <span className={`tag ${j.program}`}>{j.program}</span>
                  <div className="m">{j.kota}{j.jumlah_bantuan ? ` · ${j.jumlah_bantuan} ${j.satuan || ''}` : ''}</div></div>
              </div>)
          })}
        </div>
      </div>

      <div className="sect"><h2>Peta Sebaran Aset</h2><Link href="/admin/aset">Kelola data aset</Link></div>
      <div className="card" style={{ marginTop: 8 }}>
        <PetaSemua height={340} items={titik.map((a) => ({
          id: a.id, lat: a.latitude, lng: a.longitude, title: a.nama, program: a.program,
          sub: `${a.kota || ''}${a.jumlah_pm ? ' - ' + a.jumlah_pm + ' PM' : ''}`,
        }))} />
        <div className="m" style={{ marginTop: 8 }}>{titik.length} dari {aset.length} aset sudah punya titik lokasi.</div>
      </div>

      <div className="sect"><h2>Aset Baru {TAHUN}</h2></div>
      <div className="grid2" style={{ marginTop: 8 }}>
        <div className="card"><h3>Baru vs lama</h3><Donut a={baru.length} b={aset.length - baru.length} labelA="Aset baru" labelB="Aset lama" /></div>
        <div className="card"><h3>Per program</h3><Bars data={count(baru, (a) => a.program || 'Belum dikategorikan')} /></div>
        <div className="card"><h3>Per kota (6 teratas)</h3><Bars data={count(baru, (a) => a.kota).slice(0, 6)} /></div>
      </div>
      <div className="card">
        <h3>Aset terbaru</h3>
        {terbaru.length === 0 && <div className="m">Belum ada aset baru.</div>}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
          {terbaru.map((a) => (
            <div className="acard" key={a.id}>
              {a.foto_urls?.[0] ? <img src={a.foto_urls[0]} alt={a.nama} /> : <div className="ph">🏠</div>}
              <div>
                <b>{a.nama}</b>
                <div className="m">{a.kota || '-'} {a.program && <span className={`tag ${a.program}`}>{a.program}</span>}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
