// Pembuat tautan Google Kalender dan berkas .ics (iPhone / Android / Outlook). Murni fungsi, aman dipakai di server dan browser.
const ymd = (s) => s.replace(/-/g, '')

export function tambahHari(s, n) {
  const d = new Date(`${s}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const judulAksi = (e) => `[${e.program}] ${e.lokasi}`

export function detailAksi(e) {
  return [
    e.kota ? `Kota: ${e.kota}` : '',
    e.jumlah_bantuan ? `Bantuan: ${e.jumlah_bantuan} ${e.satuan || ''}` : '',
    e.jumlah_pm ? `Penerima manfaat: ${e.jumlah_pm}` : '',
    e.segmentasi ? `Segmentasi: ${e.segmentasi}` : '',
    'Program Pangan - Sekolah Relawan',
  ].filter(Boolean).join('\n')
}

export function googleCalUrl(e) {
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: judulAksi(e),
    dates: `${ymd(e.tanggal)}/${ymd(tambahHari(e.tanggal, 1))}`,
    details: detailAksi(e), location: [e.lokasi, e.kota].filter(Boolean).join(', '),
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

function lipat(line) {
  if (line.length <= 73) return line
  const out = []
  let sisa = line
  out.push(sisa.slice(0, 73)); sisa = sisa.slice(73)
  while (sisa.length) { out.push(' ' + sisa.slice(0, 72)); sisa = sisa.slice(72) }
  return out.join('\r\n')
}

export function buatIcs(events, nama = 'Jadwal Aksi Program Pangan') {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sekolah Relawan//Program Pangan//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(nama)}`, 'X-WR-TIMEZONE:Asia/Jakarta', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H']
  events.forEach((e) => {
    L.push('BEGIN:VEVENT', `UID:aksi-${e.id}@fpms-sekolah-relawan`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.tanggal)}`, `DTEND;VALUE=DATE:${ymd(tambahHari(e.tanggal, 1))}`,
      `SUMMARY:${esc(judulAksi(e))}`, `DESCRIPTION:${esc(detailAksi(e))}`, `LOCATION:${esc([e.lokasi, e.kota].filter(Boolean).join(', '))}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`Besok ada aksi: ${judulAksi(e)}`)}`, 'TRIGGER:-PT15H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`Hari ini ada aksi: ${judulAksi(e)}`)}`, 'TRIGGER:PT8H', 'END:VALARM',
      'END:VEVENT')
  })
  L.push('END:VCALENDAR')
  return L.map(lipat).join('\r\n') + '\r\n'
}

// unduh .ics dari browser
export function unduhIcs(events, namaFile = 'jadwal-aksi.ics') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([buatIcs(events)], { type: 'text/calendar;charset=utf-8' }))
  a.download = namaFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
