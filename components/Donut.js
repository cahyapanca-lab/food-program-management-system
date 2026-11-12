export default function Donut({ a, b, labelA, labelB }) {
  const total = a + b || 1
  const C = 2 * Math.PI * 40
  const da = (a / total) * C
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 100 100" width="120" height="120" role="img" aria-label={`${labelA} ${a}, ${labelB} ${b}`}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--b)" strokeWidth="14" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--a)" strokeWidth="14"
          strokeDasharray={`${da} ${C - da}`} transform="rotate(-90 50 50)" />
        <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor">{Math.round((a / total) * 100)}%</text>
      </svg>
      <div style={{ fontSize: 13 }}>
        <div><span style={{ color: 'var(--a)' }}>●</span> {labelA}: <b>{a}</b></div>
        <div><span style={{ color: 'var(--b)' }}>●</span> {labelB}: <b>{b}</b></div>
      </div>
    </div>
  )
}
