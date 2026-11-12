'use client'
import { iso } from '@/lib/util'

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

// kalender bulanan ala Notion. month = Date tanggal 1 pada bulan yang tampil
export default function Kalender({ events = [], month, onMonth, onDay, onEvent }) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - ((month.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const rows = days[35].getMonth() === month.getMonth() ? 6 : 5
  const today = iso(new Date())
  const by = {}
  events.forEach((e) => { (by[e.tanggal] = by[e.tanggal] || []).push(e) })
  const judul = month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const geser = (n) => onMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <div>
      <div className="f" style={{ justifyContent: 'space-between', margin: '0 0 8px' }}>
        <h2 style={{ margin: 0, textTransform: 'capitalize' }}>{judul}</h2>
        <div className="f" style={{ margin: 0 }}>
          <button className="sec" onClick={() => geser(-1)} aria-label="Bulan sebelumnya">‹</button>
          <button className="sec" onClick={() => { const d = new Date(); onMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }}>Hari ini</button>
          <button className="sec" onClick={() => geser(1)} aria-label="Bulan berikutnya">›</button>
        </div>
      </div>
      <div className="cal">
        {HARI.map((h) => <div key={h} className="ch">{h}</div>)}
        {days.slice(0, rows * 7).map((d) => {
          const k = iso(d)
          return (
            <div key={k}
              className={`cd${d.getMonth() !== month.getMonth() ? ' out' : ''}${k === today ? ' today' : ''}${onDay ? ' click' : ''}`}
              onClick={() => onDay && onDay(k)}>
              <div className="dn">{d.getDate()}</div>
              {(by[k] || []).map((e) => (
                <div key={e.id} className={`ev ${e.program}${e.selesai ? ' done' : ''}`} title={e.lokasi}
                  onClick={(ev) => { ev.stopPropagation(); onEvent && onEvent(e) }}>
                  {e.lokasi}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
