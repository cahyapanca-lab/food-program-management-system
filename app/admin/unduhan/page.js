'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { iso, count, sum, fmt, porsiOf, kgOf } from '@/lib/util'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const tgl = (s) => new Date(s + 'T00:00:00')
const aman = (s) => String(s || 'tanpa-nama').replace(/[^\w\- ]+/g, '').trim().slice(0, 50)
function unduh(blob, nama) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = nama; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

// ---------- Excel: lembar Pengajuan + lembar Aset ----------
async function excel(pgj, aset) {
  const ExcelJS = (await import('exceljs/dist/exceljs.min.js')).default
  const wb = new ExcelJS.Workbook()
  const lembar = (nama, cols, rows) => {
    const ws = wb.addWorksheet(nama)
    ws.columns = cols.map(([header, key, width]) => ({ header, key, width: width || 18 }))
    ws.addRows(rows)
    ws.getRow(1).font = { bold: true }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }
  lembar('Pengajuan', [
    ['ID', 'id', 6], ['Tanggal', 'tgl'], ['Status', 'status'], ['Program', 'program'], ['Nama pondok', 'nama_pondok', 30],
    ['Jenis', 'jenis'], ['Kota', 'kota'], ['Alamat', 'alamat_pondok', 40], ['Jumlah penghuni', 'jumlah_penghuni'],
    ['Pimpinan', 'pimpinan'], ['Beras kg/hari', 'konsumsi_beras_kg'], ['Kategori santri', 'kategori', 30],
    ['Pengaju', 'nama_pengaju'], ['No. telp', 'no_telp'], ['Organisasi', 'organisasi'], ['Latitude', 'latitude'],
    ['Longitude', 'longitude'], ['Link Maps', 'lokasi_maps', 30], ['Story', 'story', 50],
    ['Keterangan relawan', 'catatan_relawan', 50], ['Jumlah foto', 'n_foto'], ['Jumlah file santri', 'n_santri'],
  ], pgj.map((p) => ({ ...p, tgl: p.dibuat_pada?.slice(0, 10), n_foto: p.foto_urls?.length || 0, n_santri: p.file_santri?.length || 0 })))
  lembar('Aset', [
    ['Nama', 'nama', 30], ['Kota', 'kota'], ['Cluster', 'cluster'], ['Program', 'program'], ['Penerima manfaat', 'jumlah_pm'],
    ['Beras kg/hari', 'kg_beras_per_hari'], ['PIC', 'pic'], ['No. HP', 'no_hp'], ['Status', 'status'], ['Alamat', 'alamat', 40],
    ['Pimpinan', 'pimpinan'], ['Latitude', 'latitude'], ['Longitude', 'longitude'], ['Link Maps', 'lokasi_maps', 30],
    ['Sudah implementasi', 'sudah_implementasi'],
  ], aset)
  unduh(new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME }), `data-fpms-${iso(new Date())}.xlsx`)
}

// ---------- ZIP: satu folder per pondok (foto + data santri + profil.txt) ----------
async function zip(list, setInfo) {
  const JSZip = (await import('jszip')).default
  const z = new JSZip()
  let gagal = 0, i = 0
  for (const p of list) {
    setInfo(`Menyiapkan ${++i}/${list.length}: ${p.nama_pondok}`)
    const d = z.folder(`${p.id}-${aman(p.nama_pondok)}`)
    d.file('profil.txt', [
      `Nama: ${p.nama_pondok}`, `Program: ${p.program}`, `Jenis: ${p.jenis || '-'}`, `Kota: ${p.kota || '-'}`,
      `Alamat: ${p.alamat_pondok || '-'}`, `Jumlah penghuni: ${p.jumlah_penghuni ?? '-'}`, `Pimpinan: ${p.pimpinan || '-'}`,
      `Beras (kg/hari): ${p.konsumsi_beras_kg ?? '-'}`, `Kategori santri: ${p.kategori || '-'}`,
      `Pengaju: ${p.nama_pengaju} (${p.no_telp}) ${p.organisasi || ''}`, `Maps: ${p.lokasi_maps || '-'}`,
      '', 'Keterangan relawan:', p.catatan_relawan || '-', '', 'Story:', p.story || '-',
    ].join('\n'))
    await Promise.all((p.foto_urls || []).map(async (u, k) => {
      try { d.file(`foto/foto-${k + 1}.jpg`, await (await fetch(u)).blob()) } catch { gagal++ }
    }))
    let k = 0
    for (const path of p.file_santri || []) {
      try {
        const { data, error } = await supabase.storage.from('data-santri').createSignedUrl(path, 300)
        if (error) throw error
        const asli = path.split('/').pop().replace(/^\d+-\w+-/, '')
        d.file(`data-santri/${++k}-${asli}`, await (await fetch(data.signedUrl)).blob())
      } catch { gagal++ }
    }
  }
  setInfo('Membuat file ZIP…')
  unduh(await z.generateAsync({ type: 'blob' }), `berkas-fpms-${iso(new Date())}.zip`)
  return gagal ? `Selesai, tetapi ${gagal} file gagal diunduh.` : null
}

// ---------- PPT rekap (grafik native, bisa diedit di PowerPoint) ----------
async function ppt({ mode, tanggal, bulan, hanyaSelesai }, jad) {
  let a, b
  if (mode === 'minggu') {
    const d = tgl(tanggal), sen = new Date(d), min = new Date(d)
    sen.setDate(d.getDate() - ((d.getDay() + 6) % 7)); min.setTime(sen.getTime()); min.setDate(sen.getDate() + 6)
    a = iso(sen); b = iso(min)
  } else {
    const [y, m] = bulan.split('-').map(Number)
    a = iso(new Date(y, m - 1, 1)); b = iso(new Date(y, m, 0))
  }
  const L = (s, o = { day: 'numeric', month: 'long', year: 'numeric' }) => tgl(s).toLocaleDateString('id-ID', o)
  const rows = jad.filter((j) => j.tanggal >= a && j.tanggal <= b && (!hanyaSelesai || j.selesai))
    .sort((x, y) => x.tanggal.localeCompare(y.tanggal))
  const periode = `${L(a)} - ${L(b)}`
  const jenis = mode === 'minggu' ? 'Mingguan' : 'Bulanan'

  const PptxGenJS = (await import('pptxgenjs/dist/pptxgen.bundle.js')).default
  const p = new PptxGenJS()
  p.layout = 'LAYOUT_WIDE'
  const HIJAU = '1F7A4D', GELAP = '1D2A22'
  const slide = (t) => {
    const s = p.addSlide()
    s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: HIJAU } })
    s.addText(t, { x: 0.5, y: 0.1, w: 12.3, h: 0.7, fontSize: 26, bold: true, color: 'FFFFFF' })
    return s
  }

  const s1 = p.addSlide()
  s1.background = { color: HIJAU }
  s1.addText(`Rekap Aksi ${jenis}`, { x: 0.8, y: 2.3, w: 11.7, h: 1.2, fontSize: 44, bold: true, color: 'FFFFFF' })
  s1.addText('Program Pangan - Sekolah Relawan (BUYD & FFC)', { x: 0.8, y: 3.5, w: 11.7, h: 0.6, fontSize: 22, color: 'E0F1E8' })
  s1.addText(periode, { x: 0.8, y: 4.2, w: 11.7, h: 0.6, fontSize: 20, color: 'E0F1E8' })

  if (rows.length === 0) {
    slide('Ringkasan').addText('Tidak ada aksi pada periode ini.', { x: 0.5, y: 2.5, w: 12.3, h: 1, fontSize: 24, color: GELAP })
  } else {
    const kpi = [
      ['Total aksi', rows.length], ['Terlaksana', rows.filter((j) => j.selesai).length], ['Total porsi', fmt(porsiOf(rows))],
      ['Total beras (kg)', fmt(kgOf(rows))], ['Penerima manfaat', fmt(sum(rows, 'jumlah_pm'))], ['Jumlah kota', count(rows, (j) => j.kota).length],
    ]
    const s2 = slide(`Ringkasan ${jenis}`)
    kpi.forEach(([n, v], i) => {
      const x = 0.5 + (i % 3) * 4.15, y = 1.3 + Math.floor(i / 3) * 2.8
      s2.addShape(p.ShapeType.roundRect, { x, y, w: 3.9, h: 2.5, fill: { color: 'E0F1E8' }, line: { color: HIJAU, width: 1 } })
      s2.addText(String(v), { x, y: y + 0.3, w: 3.9, h: 1.2, fontSize: 48, bold: true, color: HIJAU, align: 'center' })
      s2.addText(n, { x, y: y + 1.5, w: 3.9, h: 0.6, fontSize: 18, color: GELAP, align: 'center' })
    })

    const perKota = count(rows, (j) => j.kota).slice(0, 8)
    const perProg = count(rows, (j) => j.program)
    const s3 = slide('Sebaran Aksi')
    s3.addChart(p.charts.BAR, [{ name: 'Jumlah aksi', labels: perKota.map((x) => x[0]), values: perKota.map((x) => x[1]) }],
      { x: 0.4, y: 1.1, w: 7.6, h: 5.9, barDir: 'bar', chartColors: [HIJAU], showValue: true, showTitle: true, title: 'Aksi per kota (8 teratas)', titleFontSize: 16 })
    s3.addChart(p.charts.DOUGHNUT, [{ name: 'Program', labels: perProg.map((x) => x[0]), values: perProg.map((x) => x[1]) }],
      { x: 8.2, y: 1.1, w: 4.8, h: 5.9, chartColors: [HIJAU, 'D97706'], showLegend: true, legendPos: 'b', showPercent: true, showTitle: true, title: 'Per program', titleFontSize: 16 })

    const keys = mode === 'minggu'
      ? Array.from({ length: 7 }, (_, i) => { const d = tgl(a); d.setDate(d.getDate() + i); return iso(d) })
      : [1, 2, 3, 4, 5]
    const bucket = (j) => (mode === 'minggu' ? j.tanggal : Math.ceil(Number(j.tanggal.slice(8)) / 7))
    const lab = (k) => (mode === 'minggu' ? L(k, { weekday: 'short', day: 'numeric' }) : `Minggu ${k}`)
    const s4 = slide('Tren Penerima Manfaat')
    s4.addChart(p.charts.BAR, [{ name: 'Penerima manfaat', labels: keys.map(lab), values: keys.map((k) => sum(rows.filter((j) => bucket(j) === k), 'jumlah_pm')) }],
      { x: 0.5, y: 1.1, w: 12.3, h: 5.9, barDir: 'col', chartColors: [HIJAU], showValue: true, showTitle: true, title: `Penerima manfaat per ${mode === 'minggu' ? 'hari' : 'minggu'}`, titleFontSize: 16 })

    const per = 9, hal = Math.ceil(rows.length / per)
    for (let i = 0; i < rows.length; i += per) {
      const s = slide(`Daftar Aksi (${i / per + 1}/${hal})`)
      const head = ['Tanggal', 'Program', 'Kota', 'Lokasi', 'Bantuan', 'PM'].map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: HIJAU } } }))
      s.addTable([head, ...rows.slice(i, i + per).map((j) => [
        L(j.tanggal, { day: 'numeric', month: 'short' }), j.program, j.kota || '-', j.lokasi,
        j.jumlah_bantuan ? `${j.jumlah_bantuan} ${j.satuan || ''}` : '-', String(j.jumlah_pm ?? '-'),
      ])], { x: 0.5, y: 1.2, w: 12.3, colW: [1.5, 1.2, 2, 4.6, 1.7, 1.3], fontSize: 12, border: { type: 'solid', color: 'D0D7D2', pt: 0.5 } })
    }
  }
  await p.writeFile({ fileName: `rekap-aksi-${jenis.toLowerCase()}-${a}.pptx` })
}

export default function Unduhan() {
  const { rows: pgj, error } = useTable('pengajuan', { order: 'id', asc: false })
  const { rows: aset } = useTable('aset')
  const { rows: jad } = useTable('jadwal_aksi', { order: 'tanggal' })
  const [filter, setFilter] = useState('')
  const [info, setInfo] = useState('')
  const [mode, setMode] = useState('minggu')
  const [tanggal, setTanggal] = useState(iso(new Date()))
  const [bulan, setBulan] = useState(iso(new Date()).slice(0, 7))
  const [hanyaSelesai, setHS] = useState(true)
  const list = pgj.filter((p) => !filter || p.status === filter)
  const jalan = (fn) => async () => {
    setInfo('Menyiapkan…')
    try { setInfo((await fn()) || 'Selesai.') } catch (e) { setInfo('Gagal: ' + (e.message || e)) }
  }

  return (
    <>
      <h1>Unduhan &amp; Rekap</h1>
      <div className="m">Semua file dibuat di browser kamu, lalu bisa diunggah manual ke Google Drive.</div>
      {error && <div className="err">{error}</div>}
      {info && <div className="card m">{info}</div>}

      <div className="card">
        <h2>Data pengajuan &amp; berkas</h2>
        <div className="f">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Semua status</option><option value="baru">Menunggu</option><option value="disetujui">Disetujui</option><option value="ditolak">Ditolak</option>
          </select>
          <span className="m">{list.length} pengajuan</span>
          <button onClick={jalan(() => excel(list, aset))}>⬇ Excel (pengajuan + aset)</button>
          <button className="sec" onClick={jalan(() => zip(list, setInfo))}>⬇ ZIP foto &amp; data santri ({list.length} pondok)</button>
        </div>
        <div className="sc"><table>
          <thead><tr><th>Nama</th><th>Program</th><th>Kota</th><th>Status</th><th>Foto</th><th>File santri</th><th>Keterangan</th><th /></tr></thead>
          <tbody>{list.map((p) => (
            <tr key={p.id}>
              <td>{p.nama_pondok}</td><td><span className={`tag ${p.program}`}>{p.program}</span></td><td>{p.kota}</td><td>{p.status}</td>
              <td>{p.foto_urls?.length || 0}</td><td>{p.file_santri?.length || 0}</td>
              <td title={p.catatan_relawan || ''}>{p.catatan_relawan ? p.catatan_relawan.slice(0, 40) + (p.catatan_relawan.length > 40 ? '…' : '') : '-'}</td>
              <td><button className="sec" onClick={jalan(() => zip([p], setInfo))}>ZIP</button></td>
            </tr>))}</tbody>
        </table></div>
      </div>

      <div className="card">
        <h2>Rekap aksi (PowerPoint)</h2>
        <div className="m">Berisi ringkasan angka, grafik yang bisa diedit, tren, dan daftar aksi dari Jadwal Aksi.</div>
        <div className="f">
          <select value={mode} onChange={(e) => setMode(e.target.value)}><option value="minggu">Mingguan</option><option value="bulan">Bulanan</option></select>
          {mode === 'minggu'
            ? <label style={{ margin: 0 }}>Pilih tanggal di minggu itu <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></label>
            : <label style={{ margin: 0 }}>Bulan <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} /></label>}
          <label style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={hanyaSelesai} onChange={(e) => setHS(e.target.checked)} /> Hanya aksi yang sudah terlaksana</label>
          <button onClick={jalan(() => ppt({ mode, tanggal, bulan, hanyaSelesai }, jad))}>⬇ Unduh PPT</button>
        </div>
      </div>
    </>
  )
}
