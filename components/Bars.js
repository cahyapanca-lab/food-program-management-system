export default function Bars({ data }) {
  const max = Math.max(1, ...data.map((d) => d[1]))
  if (data.length === 0) return <div className="m">Belum ada data.</div>
  return data.map(([k, v]) => (
    <div className="row" key={k}>
      <span className="lbl" title={k}>{k}</span>
      <div className="bw"><div className="bar" style={{ width: `${(v / max) * 100}%` }} /></div>
      <b>{v}</b>
    </div>
  ))
}
