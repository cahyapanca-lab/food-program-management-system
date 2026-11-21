const fmt = (n) => Number(n || 0).toLocaleString('id-ID')
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

// Kartu ringkasan angka. Dipakai di dashboard PIC dan halaman awal agar tampilannya sama.
export default function KartuRingkasan({ totalAset, pm, asetBaru, asetImpl, aksiBulan, aksiTerlaksana }) {
  const now = new Date()
  const tahun = now.getFullYear()
  const bulan = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const sampai = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
  const pAset = pct(asetImpl, totalAset)
  const pAksi = pct(aksiTerlaksana, aksiBulan)
  const kartu = { marginTop: 0 }
  return (
    <div className="grid" style={{ marginTop: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))' }}>
      <div className="card kpi" style={kartu}><div className="ic">🏠</div><b>{fmt(totalAset)}</b><span>Total aset</span></div>
      <div className="card kpi" style={kartu}><div className="ic">👥</div><b>{fmt(pm)}</b><span>Penerima manfaat</span></div>
      <div className="card kpi" style={kartu}><div className="ic">✨</div><b>{fmt(asetBaru)}</b><span>Aset baru {tahun}</span></div>
      <div className="card kpi" style={kartu}><div className="ic">🗓</div><b>{fmt(aksiBulan)}</b><span>Aksi bulan ini</span></div>
      <div className="card kpi" style={kartu}>
        <div className="ic">✅</div><b>{pAset}%</b><span>Aset sudah terimplementasi ({fmt(asetImpl)}/{fmt(totalAset)})</span>
        <div className="pbar"><div style={{ width: `${pAset}%` }} /></div>
      </div>
      <div className="card kpi" style={kartu}>
        <div className="ic">📈</div><b>{pAksi}%</b>
        <span>Implementasi aksi {bulan}: {fmt(aksiTerlaksana)} dari {fmt(aksiBulan)} aksi terlaksana (per {sampai})</span>
        <div className="pbar"><div style={{ width: `${pAksi}%` }} /></div>
      </div>
    </div>
  )
}
