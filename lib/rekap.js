import { loadLib } from '@/lib/loadlib'
import { count, fmt, sum, porsiOf, kgOf, iso } from '@/lib/util'

const HIJAU = '1F7A4D', ORANYE = 'D97706', TEKS = '1D2A22', ABU = '6B7A70', LATAR = 'F6F7F4', GARIS = 'E3E8E2'
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const tglPendek = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

export function hitungRekap({ jenis, mulai, akhir, jadwal, aset, pengajuan }) {
  const dalam = (ts) => { const d = iso(new Date(ts)); return d >= mulai && d <= akhir }
  const aksi = jadwal.filter((j) => j.tanggal >= mulai && j.tanggal <= akhir).sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const per = (prog) => aksi.filter((j) => j.program === prog)
  let labels, values
  if (jenis === 'mingguan') {
    labels = HARI
    values = HARI.map((_, i) => aksi.filter((j) => (new Date(`${j.tanggal}T00:00:00`).getDay() + 6) % 7 === i).length)
  } else {
    labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4', 'Minggu 5']
    values = labels.map((_, i) => aksi.filter((j) => Math.min(5, Math.ceil(Number(j.tanggal.slice(8, 10)) / 7)) === i + 1).length)
  }
  return {
    aksi, terlaksana: aksi.filter((j) => j.selesai).length,
    ffc: per('FFC'), buyd: per('BUYD'),
    porsi: porsiOf(aksi), kg: kgOf(aksi), pm: sum(aksi, 'jumlah_pm'),
    perKota: count(aksi, (j) => j.kota).slice(0, 8),
    tren: { labels, values },
    asetBaru: aset.filter((a) => a.dari_pengajuan && dalam(a.dibuat_pada)),
    pengajuanMasuk: pengajuan.filter((p) => dalam(p.dibuat_pada)),
  }
}

// Membuat PPT yang bisa diedit (teks, bentuk, tabel, dan grafik bawaan PowerPoint)
export async function buatRekap({ jenis, mulai, akhir, label, jadwal, aset, pengajuan }) {
  const Pptx = await loadLib('pptx')
  const st = hitungRekap({ jenis, mulai, akhir, jadwal, aset, pengajuan })
  const p = new Pptx()
  p.layout = 'LAYOUT_WIDE'
  const nama = jenis === 'mingguan' ? 'Mingguan' : 'Bulanan'
  p.title = `Rekap Aksi ${nama} Program Pangan`
  p.author = 'Program Pangan - Sekolah Relawan'

  const slide = (judul, sub) => {
    const s = p.addSlide()
    s.background = { color: LATAR }
    s.addText(judul, { x: 0.6, y: 0.35, w: 12.1, h: 0.7, fontSize: 28, bold: true, color: HIJAU, fontFace: 'Calibri' })
    if (sub) s.addText(sub, { x: 0.6, y: 1.0, w: 12.1, h: 0.4, fontSize: 14, color: ABU, fontFace: 'Calibri' })
    return s
  }
  const kartu = (s, x, y, w, h, angka, ket) => {
    s.addShape(p.ShapeType.roundRect, { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: GARIS, width: 1 }, rectRadius: 0.12 })
    s.addText(String(angka), { x: x + 0.1, y: y + 0.12, w: w - 0.2, h: h * 0.55, fontSize: 30, bold: true, color: HIJAU, align: 'center', valign: 'middle', fontFace: 'Calibri' })
    s.addText(ket, { x: x + 0.1, y: y + h * 0.64, w: w - 0.2, h: h * 0.28, fontSize: 12, color: ABU, align: 'center', valign: 'top', fontFace: 'Calibri' })
  }
  const kosong = (s, x, y, w, h, t = 'Belum ada data') => s.addText(t, { x, y, w, h, fontSize: 14, color: ABU, align: 'center', valign: 'middle', italic: true })

  // 1. Sampul
  const c = p.addSlide()
  c.background = { color: HIJAU }
  c.addText(`Rekap Aksi ${nama}`, { x: 0.8, y: 2.3, w: 11.7, h: 1.0, fontSize: 44, bold: true, color: 'FFFFFF', fontFace: 'Calibri' })
  c.addText('Program Pangan - BUYD & FFC', { x: 0.8, y: 3.3, w: 11.7, h: 0.6, fontSize: 22, color: 'E0F1E8', fontFace: 'Calibri' })
  c.addText(label, { x: 0.8, y: 3.9, w: 11.7, h: 0.5, fontSize: 18, color: 'E0F1E8', fontFace: 'Calibri' })
  c.addText('Sekolah Relawan', { x: 0.8, y: 6.3, w: 11.7, h: 0.4, fontSize: 14, color: 'E0F1E8', fontFace: 'Calibri' })

  // 2. Ringkasan
  const r = slide('Ringkasan Aksi', label)
  const kpi = [
    [st.aksi.length, 'Total aksi'], [st.terlaksana, 'Sudah terlaksana'], [st.aksi.length - st.terlaksana, 'Masih terjadwal'], [fmt(st.pm), 'Penerima manfaat'],
    [st.ffc.length, 'Aksi FFC'], [st.buyd.length, 'Aksi BUYD'], [fmt(st.porsi), 'Total porsi (FFC)'], [fmt(st.kg), 'Total beras kg (BUYD)'],
  ]
  kpi.forEach(([a, k], i) => kartu(r, 0.6 + (i % 4) * 3.1, 1.7 + Math.floor(i / 4) * 2.3, 2.9, 2.0, a, k))
  r.addText('Angka bantuan dan penerima manfaat dihitung dari seluruh aksi pada periode ini (terlaksana maupun terjadwal).', { x: 0.6, y: 6.5, w: 12.1, h: 0.4, fontSize: 11, color: ABU, italic: true })

  // 3. Infografis program & kota
  const g = slide('Infografis Aksi', label)
  if (st.aksi.length === 0) kosong(g, 0.6, 1.8, 12.1, 4, 'Belum ada aksi pada periode ini')
  else {
    const prog = [['FFC', st.ffc.length], ['BUYD', st.buyd.length]].filter(([, n]) => n > 0)
    g.addText('Aksi per program', { x: 0.6, y: 1.6, w: 5.6, h: 0.4, fontSize: 16, bold: true, color: TEKS })
    g.addChart(p.ChartType.doughnut, [{ name: 'Program', labels: prog.map(([k]) => k), values: prog.map(([, n]) => n) }],
      { x: 0.6, y: 2.0, w: 5.6, h: 4.6, holeSize: 55, chartColors: prog.map(([k]) => (k === 'FFC' ? HIJAU : ORANYE)), showLegend: true, legendPos: 'b', showPercent: false, showValue: true, dataLabelColor: 'FFFFFF', dataLabelFontSize: 14 })
    g.addText('Aksi per kota', { x: 6.8, y: 1.6, w: 5.9, h: 0.4, fontSize: 16, bold: true, color: TEKS })
    if (st.perKota.length) g.addChart(p.ChartType.bar, [{ name: 'Aksi', labels: st.perKota.map(([k]) => k), values: st.perKota.map(([, n]) => n) }],
      { x: 6.8, y: 2.0, w: 5.9, h: 4.6, barDir: 'bar', chartColors: [HIJAU], catAxisOrientation: 'maxMin', showValue: true, valGridLine: { style: 'none' }, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, showLegend: false })
    else kosong(g, 6.8, 2.0, 5.9, 4.6, 'Kota belum diisi')
  }

  // 4. Tren & penerima manfaat
  const t = slide(jenis === 'mingguan' ? 'Aksi per Hari' : 'Aksi per Minggu', label)
  t.addText(jenis === 'mingguan' ? 'Jumlah aksi per hari' : 'Jumlah aksi per minggu', { x: 0.6, y: 1.6, w: 6.4, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  t.addChart(p.ChartType.bar, [{ name: 'Aksi', labels: st.tren.labels, values: st.tren.values }],
    { x: 0.6, y: 2.0, w: 6.4, h: 4.6, barDir: 'col', chartColors: [HIJAU], showValue: true, valGridLine: { color: GARIS, size: 0.5 }, showLegend: false, valAxisMajorUnit: 1 })
  t.addText('Penerima manfaat per program', { x: 7.4, y: 1.6, w: 5.3, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  t.addChart(p.ChartType.bar, [{ name: 'Penerima manfaat', labels: ['FFC', 'BUYD'], values: [sum(st.ffc, 'jumlah_pm'), sum(st.buyd, 'jumlah_pm')] }],
    { x: 7.4, y: 2.0, w: 5.3, h: 4.6, barDir: 'col', chartColors: [ORANYE], showValue: true, valGridLine: { color: GARIS, size: 0.5 }, showLegend: false })

  // 5. Aset baru & pengajuan
  const a = slide('Aset Baru & Pengajuan', label)
  kartu(a, 0.6, 1.7, 3.0, 1.9, st.asetBaru.length, 'Aset baru disetujui')
  kartu(a, 0.6, 3.8, 3.0, 1.9, st.pengajuanMasuk.length, 'Pengajuan masuk')
  const bp = [['FFC', st.asetBaru.filter((x) => x.program === 'FFC').length], ['BUYD', st.asetBaru.filter((x) => x.program === 'BUYD').length], ['Belum dikategorikan', st.asetBaru.filter((x) => !x.program).length]].filter(([, n]) => n > 0)
  if (bp.length) a.addChart(p.ChartType.doughnut, [{ name: 'Aset baru', labels: bp.map(([k]) => k), values: bp.map(([, n]) => n) }],
    { x: 3.9, y: 1.7, w: 4.2, h: 4.2, holeSize: 55, chartColors: bp.map(([k]) => (k === 'FFC' ? HIJAU : k === 'BUYD' ? ORANYE : '64748B')), showLegend: true, legendPos: 'b', showValue: true, dataLabelColor: 'FFFFFF' })
  else kosong(a, 3.9, 1.7, 4.2, 4.2, 'Belum ada aset baru')
  a.addText('Aset baru periode ini', { x: 8.4, y: 1.7, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  const daftar = st.asetBaru.slice(0, 9).map((x) => ({ text: `${x.nama}${x.kota ? ` (${x.kota})` : ''}`, options: { bullet: true, breakLine: true } }))
  if (daftar.length) a.addText(daftar, { x: 8.4, y: 2.1, w: 4.3, h: 3.8, fontSize: 12, color: TEKS, valign: 'top' })
  else kosong(a, 8.4, 2.1, 4.3, 3.8, '-')

  // 6+. Daftar aksi
  const head = ['Tanggal', 'Program', 'Kota', 'Lokasi', 'Bantuan', 'PM', 'Status'].map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: HIJAU }, fontSize: 12 } }))
  const baris = st.aksi.map((j) => [tglPendek(j.tanggal), j.program, j.kota || '-', j.lokasi, j.jumlah_bantuan ? `${j.jumlah_bantuan} ${j.satuan || ''}` : '-', j.jumlah_pm ?? '-', j.selesai ? 'Terlaksana' : 'Terjadwal'].map((v) => ({ text: String(v), options: { fontSize: 11, color: TEKS } })))
  const per = 9
  for (let i = 0; i < Math.max(1, Math.ceil(baris.length / per)); i++) {
    const s = slide('Daftar Aksi', baris.length > per ? `${label} - halaman ${i + 1}` : label)
    if (!baris.length) kosong(s, 0.6, 1.8, 12.1, 3, 'Belum ada aksi pada periode ini')
    else s.addTable([head, ...baris.slice(i * per, (i + 1) * per)], { x: 0.6, y: 1.6, w: 12.1, colW: [1.2, 1.1, 1.9, 4.0, 1.5, 0.9, 1.5], border: { type: 'solid', color: GARIS, pt: 1 }, fill: { color: 'FFFFFF' }, fontFace: 'Calibri', valign: 'middle' })
  }

  await p.writeFile({ fileName: `Rekap_Aksi_${nama}_${mulai}.pptx` })
}
