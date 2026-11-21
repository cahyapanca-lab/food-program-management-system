import { loadLib } from '@/lib/loadlib'
import { count, fmt, sum, porsiOf, kgOf, iso, statusAksi, bermasalah, labelStatus, hariKeMinggu, LABEL_MINGGU } from '@/lib/util'
import { rekapRelawan, relawanTerlibat, peserta, ucapan, namaBulan } from '@/lib/relawan'
import { excelWorkbook, barisAset, barisAksi, barisPengajuan } from '@/lib/ekspor'
import { terlambatTugas, STATUS_TUGAS, URUT_STATUS, PRIORITAS } from '@/lib/tugas'

const HIJAU = '1F7A4D', ORANYE = 'D97706', TEKS = '1D2A22', ABU = '6B7A70', LATAR = 'F6F7F4', GARIS = 'E3E8E2', MERAH = 'C0392B'
const HARI = LABEL_MINGGU
const tglPendek = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export function hitungRekap({ jenis, mulai, akhir, jadwal, aset, pengajuan, tugas = [] }) {
  const hari = iso(new Date())
  const dalam = (ts) => { const d = iso(new Date(ts)); return d >= mulai && d <= akhir }
  const aksi = jadwal.filter((j) => j.tanggal >= mulai && j.tanggal <= akhir).sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const per = (prog) => aksi.filter((j) => j.program === prog)
  let labels, values
  if (jenis === 'mingguan') {
    labels = HARI
    values = HARI.map((_, i) => aksi.filter((j) => hariKeMinggu(new Date(`${j.tanggal}T00:00:00`).getDay()) === i).length)
  } else if (jenis === 'semester' || jenis === 'tahunan') {
    const m0 = Number(mulai.slice(5, 7)) - 1
    labels = Array.from({ length: jenis === 'tahunan' ? 12 : 6 }, (_, i) => BLN[m0 + i])
    values = labels.map((_, i) => aksi.filter((j) => Number(j.tanggal.slice(5, 7)) - 1 === m0 + i).length)
  } else {
    labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4', 'Minggu 5']
    values = labels.map((_, i) => aksi.filter((j) => Math.min(5, Math.ceil(Number(j.tanggal.slice(8, 10)) / 7)) === i + 1).length)
  }
  const kendala = aksi.filter((j) => bermasalah(j, hari)).map((j) => ({
    ...j,
    statusLabel: labelStatus(j, hari),
    alasan: j.kendala_alasan || (statusAksi(j) === 'terjadwal' ? 'Belum ada laporan pelaksanaan (lewat jadwal)' : '-'),
    kategori: j.kendala_kategori || (statusAksi(j) === 'terjadwal' ? 'Belum dilaporkan' : 'Belum diisi'),
  }))
  // to-do: selesai pada periode, terlambat, dan yang jatuh tempo pada periode
  const tSelesai = tugas.filter((t) => t.status === 'selesai' && t.selesai_pada && dalam(t.selesai_pada))
  const tTerlambat = tugas.filter((t) => terlambatTugas(t, hari) && t.tenggat <= akhir)
  const tTenggat = tugas.filter((t) => t.tenggat && t.tenggat >= mulai && t.tenggat <= akhir && t.status !== 'selesai')
  const tMap = new Map()
  ;[...tSelesai, ...tTerlambat, ...tTenggat].forEach((t) => tMap.set(t.id, t))
  const tDaftar = [...tMap.values()].sort((a, b) => (a.tenggat || '9999').localeCompare(b.tenggat || '9999'))
  const tugasStat = {
    selesai: tSelesai.length, terlambat: tTerlambat.length, dibuat: tugas.filter((t) => dalam(t.dibuat_pada)).length,
    proses: tugas.filter((t) => t.status === 'proses').length, total: tugas.length,
    perStatus: URUT_STATUS.map((s) => [STATUS_TUGAS[s], tugas.filter((t) => t.status === s).length]),
  }
  const bulanKey = mulai.slice(0, 7)
  const apresiasi = jenis === 'bulanan' ? rekapRelawan(jadwal, bulanKey, true).filter((r) => r.rank <= 3) : []
  return {
    hari, aksi,
    terlaksana: aksi.filter((j) => statusAksi(j) === 'terlaksana').length,
    terjadwal: aksi.filter((j) => statusAksi(j) === 'terjadwal' && j.tanggal >= hari).length,
    ffc: per('FFC'), buyd: per('BUYD'),
    porsi: porsiOf(aksi), kg: kgOf(aksi), pm: sum(aksi, 'jumlah_pm'),
    perKota: count(aksi, (j) => j.kota).slice(0, 8),
    tren: { labels, values },
    kendala, perKategori: count(kendala, (k) => k.kategori),
    relawan: relawanTerlibat(aksi),
    perRelawan: rekapRelawan(aksi, null, false).slice(0, 8),
    apresiasi,
    bulanLabel: namaBulan(new Date(`${mulai}T00:00:00`)),
    tugasStat, tugasDaftar: tDaftar, tugasPeriode: new Set(tDaftar.map((t) => t.id)),
    totalAset: aset.length,
    asetLama: aset.filter((a) => !a.dari_pengajuan).length,
    asetDariRelawan: aset.filter((a) => a.dari_pengajuan).length,
    pmSemua: sum(aset, 'jumlah_pm'),
    progAset: { FFC: aset.filter((a) => a.program === 'FFC').length, BUYD: aset.filter((a) => a.program === 'BUYD').length, kosong: aset.filter((a) => !a.program).length },
    perCluster: count(aset, (a) => a.cluster).slice(0, 6),
    asetBaru: aset.filter((a) => a.dari_pengajuan && dalam(a.dibuat_pada)),
    pengajuanMasuk: pengajuan.filter((p) => dalam(p.dibuat_pada)),
  }
}

// ---------- Excel lengkap: aksi + kendala + SEMUA aset (lama & baru) + pengajuan + relawan ----------
export async function excelRekapLengkap({ jenis, mulai, akhir, label, jadwal, aset, pengajuan, tugas = [] }) {
  const st = hitungRekap({ jenis, mulai, akhir, jadwal, aset, pengajuan, tugas })
  const ringkas = [
    ['Periode', label], ['Total aksi', st.aksi.length], ['Terlaksana', st.terlaksana], ['Masih terjadwal', st.terjadwal], ['Aksi terkendala', st.kendala.length],
    ['Aksi FFC', st.ffc.length], ['Aksi BUYD', st.buyd.length], ['Total porsi (FFC)', st.porsi], ['Total beras kg (BUYD)', st.kg],
    ['Penerima manfaat (aksi periode)', st.pm], ['Relawan terlibat', st.relawan.length], ['Pengajuan masuk', st.pengajuanMasuk.length], ['Aset baru disetujui', st.asetBaru.length],
    ['Total aset (lama + baru)', st.totalAset], ['Aset lama (data awal)', st.asetLama], ['Aset baru dari relawan', st.asetDariRelawan], ['Penerima manfaat seluruh aset', st.pmSemua],
  ]
  const tPer = new Map(rekapRelawan(st.aksi, null, true).map((r) => [r.key, r.jumlah]))
  const lPer = rekapRelawan(st.aksi, null, false)
  const tAll = new Map(rekapRelawan(jadwal, null, true).map((r) => [r.key, r.jumlah]))
  const lAll = new Map(rekapRelawan(jadwal, null, false).map((r) => [r.key, r.jumlah]))
  const nama = new Map()
  ;[...lPer, ...rekapRelawan(jadwal, null, false)].forEach((r) => nama.set(r.key, r.nama))
  const relawan = [...nama.entries()].map(([key, n]) => ({
    Nama: n, 'Aksi diikuti (periode)': lPer.find((r) => r.key === key)?.jumlah || 0, 'Aksi terlaksana (periode)': tPer.get(key) || 0,
    'Aksi diikuti (semua waktu)': lAll.get(key) || 0, 'Aksi terlaksana (semua waktu)': tAll.get(key) || 0,
  })).sort((a, b) => b['Aksi terlaksana (semua waktu)'] - a['Aksi terlaksana (semua waktu)'] || a.Nama.localeCompare(b.Nama, 'id'))
  await excelWorkbook([
    { nama: 'Ringkasan', data: ringkas.map(([k, v]) => ({ Keterangan: k, Nilai: v })) },
    { nama: 'Aksi periode', data: st.aksi.map(barisAksi) },
    { nama: 'Kendala', data: st.kendala.map((k) => ({ Tanggal: k.tanggal, Program: k.program, Lokasi: k.lokasi, Status: k.statusLabel, Kategori: k.kategori, 'Alasan / kendala': k.alasan })) },
    { nama: 'Data aset (lama+baru)', data: aset.map(barisAset) },
    { nama: 'Pengajuan periode', data: st.pengajuanMasuk.map(barisPengajuan) },
    { nama: 'Relawan', data: relawan },
    {
      nama: 'To-do',
      data: tugas.map((t) => ({
        Judul: t.judul, Deskripsi: t.deskripsi, Status: STATUS_TUGAS[t.status], Prioritas: PRIORITAS[t.prioritas], Tenggat: t.tenggat,
        'Terlambat': terlambatTugas(t, st.hari) ? 'Ya' : '', 'Penanggung jawab': t.penanggung_jawab,
        'Aset terkait': aset.find((a) => a.id === t.aset_id)?.nama || '', 'Aksi terkait': jadwal.find((j) => j.id === t.jadwal_id)?.lokasi || '',
        'Tampil di jadwal': t.tampil_di_jadwal ? 'Ya' : '', Dibuat: (t.dibuat_pada || '').slice(0, 10), 'Selesai pada': (t.selesai_pada || '').slice(0, 10),
        'Relevan periode ini': st.tugasPeriode.has(t.id) ? 'Ya' : 'Tidak',
      })),
    },
  ], `Rekap_Lengkap_${jenis}_${mulai}.xlsx`)
}

// ---------- PPT yang bisa diedit (teks, bentuk, tabel, dan grafik bawaan PowerPoint) ----------
export async function buatRekap({ jenis, mulai, akhir, label, jadwal, aset, pengajuan, tugas = [], kolaborasi = [], dana = [], alat = [], opname = [] }) {
  const Pptx = await loadLib('pptx')
  const st = hitungRekap({ jenis, mulai, akhir, jadwal, aset, pengajuan, tugas })
  const p = new Pptx()
  p.layout = 'LAYOUT_WIDE'
  const nama = { mingguan: 'Mingguan', bulanan: 'Bulanan', semester: 'Per 6 Bulan', tahunan: 'Tahunan' }[jenis] || 'Bulanan'
  p.title = `Rekap Aksi ${nama} Program Pangan`
  p.author = 'Program Pangan - Sekolah Relawan'

  const slide = (judul, sub) => {
    const s = p.addSlide()
    s.background = { color: LATAR }
    s.addText(judul, { x: 0.6, y: 0.35, w: 12.1, h: 0.7, fontSize: 28, bold: true, color: HIJAU, fontFace: 'Calibri' })
    if (sub) s.addText(sub, { x: 0.6, y: 1.0, w: 12.1, h: 0.4, fontSize: 14, color: ABU, fontFace: 'Calibri' })
    return s
  }
  const kartu = (s, x, y, w, h, angka, ket, warna = HIJAU) => {
    s.addShape(p.ShapeType.roundRect, { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: GARIS, width: 1 }, rectRadius: 0.12 })
    s.addText(String(angka), { x: x + 0.1, y: y + 0.12, w: w - 0.2, h: h * 0.55, fontSize: 30, bold: true, color: warna, align: 'center', valign: 'middle', fontFace: 'Calibri' })
    s.addText(ket, { x: x + 0.1, y: y + h * 0.64, w: w - 0.2, h: h * 0.28, fontSize: 12, color: ABU, align: 'center', valign: 'top', fontFace: 'Calibri' })
  }
  const kosong = (s, x, y, w, h, t = 'Belum ada data') => s.addText(t, { x, y, w, h, fontSize: 14, color: ABU, align: 'center', valign: 'middle', italic: true })
  const head = (cols) => cols.map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: HIJAU }, fontSize: 12 } }))
  const sel = (v, extra = {}) => ({ text: String(v), options: { fontSize: 11, color: TEKS, ...extra } })

  // 1. Sampul
  const c = p.addSlide()
  c.background = { color: HIJAU }
  c.addText(`Rekap Aksi ${nama}`, { x: 0.8, y: 2.3, w: 11.7, h: 1.0, fontSize: 44, bold: true, color: 'FFFFFF', fontFace: 'Calibri' })
  c.addText('Program Pangan - BUYD & FFC', { x: 0.8, y: 3.3, w: 11.7, h: 0.6, fontSize: 22, color: 'E0F1E8', fontFace: 'Calibri' })
  c.addText(label, { x: 0.8, y: 3.9, w: 11.7, h: 0.5, fontSize: 18, color: 'E0F1E8', fontFace: 'Calibri' })
  c.addText('Sekolah Relawan', { x: 0.8, y: 6.3, w: 11.7, h: 0.4, fontSize: 14, color: 'E0F1E8', fontFace: 'Calibri' })

  // 2. Ringkasan (10 kartu)
  const r = slide('Ringkasan Aksi', label)
  const kpi = [
    [st.aksi.length, 'Total aksi'], [st.terlaksana, 'Sudah terlaksana'], [st.terjadwal, 'Masih terjadwal'],
    [st.kendala.length, 'Aksi terkendala', st.kendala.length ? MERAH : HIJAU], [st.relawan.length, 'Relawan terlibat'],
    [st.ffc.length, 'Aksi FFC'], [st.buyd.length, 'Aksi BUYD'], [fmt(st.porsi), 'Total porsi (FFC)'], [fmt(st.kg), 'Total beras kg (BUYD)'], [fmt(st.pm), 'Penerima manfaat'],
  ]
  kpi.forEach(([a, k, w], i) => kartu(r, 0.6 + (i % 5) * 2.45, 1.7 + Math.floor(i / 5) * 2.3, 2.3, 2.0, a, k, w))
  r.addText('Angka bantuan dan penerima manfaat dihitung dari seluruh aksi pada periode ini. Relawan terlibat = relawan unik yang tercatat pada aksi periode ini (aksi dibatalkan tidak dihitung).', { x: 0.6, y: 6.4, w: 12.1, h: 0.6, fontSize: 11, color: ABU, italic: true })

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
  const t = slide(jenis === 'mingguan' ? 'Aksi per Hari' : jenis === 'bulanan' ? 'Aksi per Minggu' : 'Aksi per Bulan', label)
  t.addText(jenis === 'mingguan' ? 'Jumlah aksi per hari' : jenis === 'bulanan' ? 'Jumlah aksi per minggu' : 'Jumlah aksi per bulan', { x: 0.6, y: 1.6, w: 6.4, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  t.addChart(p.ChartType.bar, [{ name: 'Aksi', labels: st.tren.labels, values: st.tren.values }],
    { x: 0.6, y: 2.0, w: 6.4, h: 4.6, barDir: 'col', chartColors: [HIJAU], showValue: true, valGridLine: { color: GARIS, size: 0.5 }, showLegend: false, valAxisMajorUnit: 1 })
  t.addText('Penerima manfaat per program', { x: 7.4, y: 1.6, w: 5.3, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  t.addChart(p.ChartType.bar, [{ name: 'Penerima manfaat', labels: ['FFC', 'BUYD'], values: [sum(st.ffc, 'jumlah_pm'), sum(st.buyd, 'jumlah_pm')] }],
    { x: 7.4, y: 2.0, w: 5.3, h: 4.6, barDir: 'col', chartColors: [ORANYE], showValue: true, valGridLine: { color: GARIS, size: 0.5 }, showLegend: false })

  // 5. Kendala & bottleneck
  const kd = slide('Kendala & Bottleneck', label)
  if (!st.kendala.length) kosong(kd, 0.6, 1.8, 12.1, 4, 'Tidak ada kendala atau keterlambatan tercatat pada periode ini')
  else {
    kd.addText('Kendala per kategori', { x: 0.6, y: 1.6, w: 4.6, h: 0.4, fontSize: 16, bold: true, color: TEKS })
    kd.addChart(p.ChartType.bar, [{ name: 'Aksi terkendala', labels: st.perKategori.map(([k]) => k), values: st.perKategori.map(([, n]) => n) }],
      { x: 0.6, y: 2.0, w: 4.6, h: 4.6, barDir: 'bar', chartColors: [MERAH], catAxisOrientation: 'maxMin', showValue: true, valGridLine: { style: 'none' }, catAxisLabelFontSize: 10, showLegend: false, valAxisMajorUnit: 1 })
    const baris = st.kendala.map((k) => [sel(tglPendek(k.tanggal)), sel(k.lokasi), sel(k.statusLabel), sel(k.alasan)])
    kd.addTable([head(['Tanggal', 'Lokasi', 'Status', 'Alasan / kendala']), ...baris.slice(0, 6)], { x: 5.5, y: 1.6, w: 7.2, colW: [1.0, 2.1, 1.3, 2.8], border: { type: 'solid', color: GARIS, pt: 1 }, fill: { color: 'FFFFFF' }, fontFace: 'Calibri', valign: 'middle' })
    for (let i = 6; i < baris.length; i += 8) {
      const s = slide('Kendala & Bottleneck (lanjutan)', label)
      s.addTable([head(['Tanggal', 'Lokasi', 'Status', 'Alasan / kendala']), ...baris.slice(i, i + 8)], { x: 0.6, y: 1.6, w: 12.1, colW: [1.2, 3.0, 1.6, 6.3], border: { type: 'solid', color: GARIS, pt: 1 }, fill: { color: 'FFFFFF' }, fontFace: 'Calibri', valign: 'middle' })
    }
  }

  // 6. Relawan terlibat
  const rl = slide('Relawan Terlibat', label)
  kartu(rl, 0.6, 1.7, 3.0, 2.0, st.relawan.length, 'Relawan terlibat')
  kartu(rl, 0.6, 3.9, 3.0, 2.0, st.aksi.filter((j) => peserta(j).length).length, 'Aksi dengan relawan tercatat')
  rl.addText('Aksi yang diikuti per relawan (8 teratas)', { x: 4.0, y: 1.6, w: 8.7, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  if (st.perRelawan.length) rl.addChart(p.ChartType.bar, [{ name: 'Aksi diikuti', labels: st.perRelawan.map((x) => x.nama), values: st.perRelawan.map((x) => x.jumlah) }],
    { x: 4.0, y: 2.0, w: 8.7, h: 4.6, barDir: 'bar', chartColors: [HIJAU], catAxisOrientation: 'maxMin', showValue: true, valGridLine: { style: 'none' }, catAxisLabelFontSize: 11, showLegend: false, valAxisMajorUnit: 1 })
  else kosong(rl, 4.0, 2.0, 8.7, 4.6, 'Belum ada relawan tercatat pada aksi periode ini')

  // 6b. To-do & tindak lanjut
  const td = slide('To-do & Tindak Lanjut', label)
  ;[[st.tugasStat.selesai, 'Selesai pada periode'], [st.tugasStat.proses, 'Sedang dikerjakan (saat ini)'], [st.tugasStat.terlambat, 'Terlambat', st.tugasStat.terlambat ? MERAH : HIJAU], [st.tugasStat.dibuat, 'To-do baru dibuat']]
    .forEach(([n, k, w], i) => kartu(td, 0.6 + i * 3.1, 1.6, 2.9, 1.5, n, k, w))
  const warnaS = { 'Akan dikerjakan': '64748B', 'Sedang dikerjakan': ORANYE, 'Menunggu / terkendala': 'B45309', Selesai: HIJAU }
  const ps = st.tugasStat.perStatus.filter(([, n]) => n > 0)
  if (ps.length) td.addChart(p.ChartType.doughnut, [{ name: 'To-do', labels: ps.map(([k]) => k), values: ps.map(([, n]) => n) }],
    { x: 0.6, y: 3.3, w: 4.2, h: 3.8, holeSize: 55, chartColors: ps.map(([k]) => warnaS[k]), showLegend: true, legendPos: 'b', showValue: true, dataLabelColor: 'FFFFFF' })
  else kosong(td, 0.6, 3.3, 4.2, 3.8, 'Belum ada to-do')
  const tb = st.tugasDaftar.map((t) => [sel(t.judul), sel(t.penanggung_jawab || '-'), sel(t.tenggat ? tglPendek(t.tenggat) : '-'), sel(terlambatTugas(t, st.hari) ? `${STATUS_TUGAS[t.status]} (terlambat)` : STATUS_TUGAS[t.status])])
  if (tb.length) {
    td.addTable([head(['To-do', 'PJ', 'Tenggat', 'Status']), ...tb.slice(0, 5)], { x: 5.1, y: 3.3, w: 7.6, colW: [3.1, 1.4, 1.1, 2.0], border: { type: 'solid', color: GARIS, pt: 1 }, fill: { color: 'FFFFFF' }, fontFace: 'Calibri', valign: 'middle' })
    for (let i = 5; i < tb.length; i += 8) {
      const s = slide('To-do & Tindak Lanjut (lanjutan)', label)
      s.addTable([head(['To-do', 'PJ', 'Tenggat', 'Status']), ...tb.slice(i, i + 8)], { x: 0.6, y: 1.6, w: 12.1, colW: [6.0, 2.0, 1.6, 2.5], border: { type: 'solid', color: GARIS, pt: 1 }, fill: { color: 'FFFFFF' }, fontFace: 'Calibri', valign: 'middle' })
    }
  } else kosong(td, 5.1, 3.3, 7.6, 3.8, 'Tidak ada to-do yang relevan pada periode ini')

  // 7. Apresiasi relawan (laporan bulanan): tangga juara + ucapan
  if (jenis === 'bulanan') {
    const ap = slide(`Apresiasi Relawan - ${st.bulanLabel}`, 'Relawan teraktif pada program Pangan (dari aksi berstatus Terlaksana)')
    if (!st.apresiasi.length) kosong(ap, 0.6, 1.8, 12.1, 4, 'Belum ada relawan tercatat pada aksi terlaksana bulan ini')
    else {
      const pod = st.apresiasi.slice(0, 3)
      const letak = pod.length === 3 ? [1, 0, 2] : pod.length === 2 ? [1, 0] : [0]
      const x0 = pod.length === 3 ? 2.6 : pod.length === 2 ? 3.9 : 5.4
      const tinggi = [2.1, 1.65, 1.25], warna = ['D4A017', '94A3B8', 'B45309'], dasar = 4.5
      letak.forEach((idx, pos) => {
        const x = x0 + pos * 2.7, h = tinggi[idx]
        ap.addText(pod[idx].nama, { x: x - 0.2, y: dasar - h - 0.7, w: 2.6, h: 0.6, fontSize: 16, bold: true, color: TEKS, align: 'center', valign: 'bottom' })
        ap.addShape(p.ShapeType.rect, { x, y: dasar - h, w: 2.2, h, fill: { color: warna[idx] }, line: { color: warna[idx] } })
        ap.addText([{ text: `#${pod[idx].rank}`, options: { fontSize: 28, bold: true, breakLine: true } }, { text: `${pod[idx].jumlah} aksi`, options: { fontSize: 13 } }], { x, y: dasar - h, w: 2.2, h: Math.min(h, 1.2), color: 'FFFFFF', align: 'center', valign: 'middle' })
      })
      ap.addText(st.apresiasi.map((x) => ({ text: ucapan({ nama: x.nama, rank: x.rank, bulan: st.bulanLabel }), options: { breakLine: true, bullet: true } })),
        { x: 0.6, y: 4.75, w: 12.1, h: 2.4, fontSize: 12, color: TEKS, valign: 'top', paraSpaceAfter: 4 })
    }
  }

  // 8. Data aset keseluruhan (lama + baru)
  const h = slide('Data Aset Keseluruhan', 'Seluruh aset: data lama dan aset baru dari relawan')
  ;[[st.totalAset, 'Total aset'], [st.asetLama, 'Aset lama (data awal)'], [st.asetDariRelawan, 'Aset baru dari relawan'], [fmt(st.pmSemua), 'Penerima manfaat (seluruh aset)']]
    .forEach(([n, k], i) => kartu(h, 0.6, 1.7 + i * 1.25, 3.0, 1.1, n, k))
  const ap2 = [['FFC', st.progAset.FFC], ['BUYD', st.progAset.BUYD], ['Belum dikategorikan', st.progAset.kosong]].filter(([, n]) => n > 0)
  if (ap2.length) h.addChart(p.ChartType.doughnut, [{ name: 'Aset', labels: ap2.map(([k]) => k), values: ap2.map(([, n]) => n) }],
    { x: 3.9, y: 1.7, w: 4.2, h: 4.8, holeSize: 55, chartColors: ap2.map(([k]) => (k === 'FFC' ? HIJAU : k === 'BUYD' ? ORANYE : '64748B')), showLegend: true, legendPos: 'b', showValue: true, dataLabelColor: 'FFFFFF' })
  else kosong(h, 3.9, 1.7, 4.2, 4.8, 'Belum ada data aset')
  h.addText('Aset per cluster', { x: 8.4, y: 1.7, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  if (st.perCluster.length) h.addChart(p.ChartType.bar, [{ name: 'Aset', labels: st.perCluster.map(([k]) => k), values: st.perCluster.map(([, n]) => n) }],
    { x: 8.4, y: 2.1, w: 4.3, h: 4.4, barDir: 'bar', chartColors: [HIJAU], catAxisOrientation: 'maxMin', showValue: true, valGridLine: { style: 'none' }, catAxisLabelFontSize: 11, showLegend: false })
  else kosong(h, 8.4, 2.1, 4.3, 4.4, '-')

  // 9. Aset baru & pengajuan pada periode ini
  const a = slide('Aset Baru & Pengajuan Periode Ini', label)
  kartu(a, 0.6, 1.7, 3.0, 1.9, st.asetBaru.length, 'Aset baru disetujui')
  kartu(a, 0.6, 3.8, 3.0, 1.9, st.pengajuanMasuk.length, 'Pengajuan masuk')
  const bp = [['FFC', st.asetBaru.filter((x) => x.program === 'FFC').length], ['BUYD', st.asetBaru.filter((x) => x.program === 'BUYD').length], ['Belum dikategorikan', st.asetBaru.filter((x) => !x.program).length]].filter(([, n]) => n > 0)
  if (bp.length) a.addChart(p.ChartType.doughnut, [{ name: 'Aset baru', labels: bp.map(([k]) => k), values: bp.map(([, n]) => n) }],
    { x: 3.9, y: 1.7, w: 4.2, h: 4.2, holeSize: 55, chartColors: bp.map(([k]) => (k === 'FFC' ? HIJAU : k === 'BUYD' ? ORANYE : '64748B')), showLegend: true, legendPos: 'b', showValue: true, dataLabelColor: 'FFFFFF' })
  else kosong(a, 3.9, 1.7, 4.2, 4.2, 'Belum ada aset baru')
  a.addText('Aset baru periode ini', { x: 8.4, y: 1.7, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  const daftar = st.asetBaru.slice(0, 9).map((x) => ({ text: `${x.nama}${x.kota ? ` (${x.kota})` : ''}`, options: { bullet: true, breakLine: true, ...(x.link_dokumentasi ? { hyperlink: { url: x.link_dokumentasi, tooltip: 'Buka dokumentasi' } } : {}) } }))
  if (daftar.length) a.addText(daftar, { x: 8.4, y: 2.1, w: 4.3, h: 3.8, fontSize: 12, color: TEKS, valign: 'top' })
  else kosong(a, 8.4, 2.1, 4.3, 3.8, '-')

  // Dokumentasi aset baru periode ini (tautan bisa diklik di PowerPoint)
  const adok = st.asetBaru.filter((x) => x.link_dokumentasi)
  const perDok = 8
  for (let i = 0; i < Math.ceil(adok.length / perDok); i++) {
    const sd = slide('Dokumentasi Aset Baru', adok.length > perDok ? `${label} - halaman ${i + 1}` : label)
    const brs = adok.slice(i * perDok, (i + 1) * perDok).map((x) => [sel(x.nama), sel(x.kota || '-'), sel(x.program || '-'),
      { text: 'Buka dokumentasi', options: { fontSize: 11, color: '0563C1', hyperlink: { url: x.link_dokumentasi, tooltip: x.link_dokumentasi } } }])
    sd.addTable([head(['Aset', 'Kota', 'Program', 'Dokumentasi']), ...brs], { x: 0.6, y: 1.6, w: 12.1, colW: [5.0, 2.8, 1.5, 2.8], border: { type: 'solid', color: GARIS, pt: 1 }, fill: { color: 'FFFFFF' }, fontFace: 'Calibri', valign: 'middle' })
  }

  // Kolaborasi mitra, penggunaan dana, dan stock opname alat
  const rp = (n) => 'Rp ' + fmt(n)
  const PAL = [HIJAU, ORANYE, '64748B', '0E7490', 'B45309', '7C3AED', MERAH]
  const dlm = (x) => x.tanggal >= mulai && x.tanggal <= akhir
  const K = kolaborasi.filter(dlm), D = dana.filter(dlm), O = opname.filter(dlm)
  const grup = (rows, kf, vf = () => 1) => { const m = {}; rows.forEach((x) => { const k = kf(x) || 'Lainnya'; m[k] = (m[k] || 0) + vf(x) }); return Object.entries(m).sort((u, v) => v[1] - u[1]) }
  const tabelOpt = { border: { type: 'solid', color: GARIS, pt: 1 }, fill: { color: 'FFFFFF' }, fontFace: 'Calibri', valign: 'middle' }

  const km = slide('Kolaborasi Mitra', label)
  kartu(km, 0.6, 1.7, 3.0, 1.5, K.length, 'Kolaborasi pada periode')
  kartu(km, 0.6, 3.4, 3.0, 1.5, new Set(K.map((x) => x.mitra.trim().toLowerCase())).size, 'Mitra terlibat')
  kartu(km, 0.6, 5.1, 3.0, 1.5, rp(sum(K, 'nilai')), 'Nilai kontribusi mitra', ORANYE)
  const kj = grup(K, (x) => x.jenis)
  if (kj.length) km.addChart(p.ChartType.doughnut, [{ name: 'Jenis', labels: kj.map(([k]) => k), values: kj.map(([, n]) => n) }],
    { x: 3.9, y: 1.7, w: 4.2, h: 4.9, holeSize: 55, chartColors: PAL.slice(0, kj.length), showLegend: true, legendPos: 'b', showValue: true, dataLabelColor: 'FFFFFF' })
  else kosong(km, 3.9, 1.7, 4.2, 4.9, 'Belum ada kolaborasi pada periode ini')
  km.addText('Daftar mitra', { x: 8.4, y: 1.7, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  const kb = K.slice(0, 8).map((x) => [sel(x.mitra), sel(x.jenis || '-'), sel(x.nilai ? rp(x.nilai) : '-')])
  if (kb.length) km.addTable([head(['Mitra', 'Jenis', 'Nilai']), ...kb], { x: 8.4, y: 2.1, w: 4.3, colW: [1.8, 1.3, 1.2], ...tabelOpt })
  else kosong(km, 8.4, 2.1, 4.3, 3.0, '-')
  if (K.length > 8) km.addText(`+ ${K.length - 8} kolaborasi lainnya (lihat Excel)`, { x: 8.4, y: 6.4, w: 4.3, h: 0.4, fontSize: 11, color: ABU })

  const dn = slide('Penggunaan Dana', label)
  kartu(dn, 0.6, 1.7, 3.0, 1.9, rp(sum(D, 'jumlah')), 'Total dana digunakan')
  kartu(dn, 0.6, 3.8, 3.0, 1.9, D.length, 'Transaksi tercatat', ORANYE)
  const dTanpa = sum(D.filter((x) => !x.program), 'jumlah')
  dn.addText([{ text: 'Dana per program', options: { bold: true, breakLine: true } },
    ...['FFC', 'BUYD', 'Umum'].map((k) => ({ text: `${k}: ${rp(sum(D.filter((x) => x.program === k), 'jumlah'))}`, options: { breakLine: true } })),
    ...(dTanpa ? [{ text: `Tanpa program: ${rp(dTanpa)}`, options: { breakLine: true } }] : [])],
    { x: 0.6, y: 5.85, w: 3.0, h: 1.4, fontSize: 12, color: TEKS, valign: 'top' })
  const dk = grup(D, (x) => x.kategori, (x) => Number(x.jumlah) || 0)
  const ds = grup(D, (x) => x.sumber, (x) => Number(x.jumlah) || 0).slice(0, 6)
  dn.addText('Dana per kategori', { x: 3.9, y: 1.7, w: 4.2, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  if (dk.length) dn.addChart(p.ChartType.doughnut, [{ name: 'Kategori', labels: dk.map(([k]) => k), values: dk.map(([, n]) => n) }],
    { x: 3.9, y: 2.1, w: 4.2, h: 4.5, holeSize: 55, chartColors: PAL.slice(0, dk.length), showLegend: true, legendPos: 'b', showPercent: true, showValue: false, dataLabelColor: 'FFFFFF' })
  else kosong(dn, 3.9, 2.1, 4.2, 4.5, 'Belum ada dana tercatat pada periode ini')
  dn.addText('Dana per sumber (Rp)', { x: 8.4, y: 1.7, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: TEKS })
  if (ds.length) dn.addChart(p.ChartType.bar, [{ name: 'Dana', labels: ds.map(([k]) => k), values: ds.map(([, n]) => n) }],
    { x: 8.4, y: 2.1, w: 4.3, h: 4.5, barDir: 'bar', chartColors: [HIJAU], catAxisOrientation: 'maxMin', showValue: true, dataLabelFormatCode: '#,##0', valAxisLabelFormatCode: '#,##0', valGridLine: { style: 'none' }, catAxisLabelFontSize: 11, showLegend: false })
  else kosong(dn, 8.4, 2.1, 4.3, 4.5, '-')

  const stok = alat.map((a) => {
    const os = O.filter((x) => x.alat_id === a.id).sort((u, v) => v.tanggal.localeCompare(u.tanggal) || v.id - u.id)
    return { a, o: os[0], n: os.length }
  })
  const perhatian = stok.filter(({ a, o }) => o && (o.jumlah_rusak + o.jumlah_hilang > 0 || (a.jumlah_standar != null && o.jumlah_baik < a.jumlah_standar))).length
  const op = slide('Stock Opname Alat', label)
  ;[[O.length, 'Catatan opname'], [stok.filter((x) => x.n > 0).length, 'Alat dicek'], [perhatian, 'Alat perlu perhatian', perhatian ? MERAH : HIJAU], [stok.filter((x) => !x.n).length, 'Alat belum dicek', ORANYE]]
    .forEach(([n, k, w], i) => kartu(op, 0.6 + i * 3.1, 1.6, 2.9, 1.5, n, k, w))
  const merah = (v) => (v ? { color: MERAH, bold: true } : {})
  const sb = stok.map(({ a, o, n }) => [sel(a.nama), sel(o ? tglPendek(o.tanggal) : '-'), sel(o ? o.jumlah_baik : '-'), sel(o ? o.jumlah_rusak : '-', o ? merah(o.jumlah_rusak) : {}), sel(o ? o.jumlah_hilang : '-', o ? merah(o.jumlah_hilang) : {}), sel(a.jumlah_standar ?? '-'), sel(n)])
  const hd = head(['Alat', 'Dicek terakhir', 'Baik', 'Rusak', 'Hilang', 'Standar', 'Jml cek'])
  const colOp = [4.2, 2.0, 1.2, 1.2, 1.2, 1.2, 1.1]
  if (!sb.length) kosong(op, 0.6, 3.4, 12.1, 3, 'Belum ada alat terdaftar')
  else op.addTable([hd, ...sb.slice(0, 5)], { x: 0.6, y: 3.4, w: 12.1, colW: colOp, ...tabelOpt })
  for (let i = 5; i < sb.length; i += 9) {
    const s = slide('Stock Opname Alat (lanjutan)', label)
    s.addTable([hd, ...sb.slice(i, i + 9)], { x: 0.6, y: 1.6, w: 12.1, colW: colOp, ...tabelOpt })
  }

  // 10+. Daftar aksi
  const baris = st.aksi.map((j) => [tglPendek(j.tanggal), j.program, j.kota || '-', j.lokasi, j.jumlah_bantuan ? `${j.jumlah_bantuan} ${j.satuan || ''}` : '-', j.jumlah_pm ?? '-', labelStatus(j, st.hari)].map((v) => sel(v)))
  const perHal = 9
  for (let i = 0; i < Math.max(1, Math.ceil(baris.length / perHal)); i++) {
    const s = slide('Daftar Aksi', baris.length > perHal ? `${label} - halaman ${i + 1}` : label)
    if (!baris.length) kosong(s, 0.6, 1.8, 12.1, 3, 'Belum ada aksi pada periode ini')
    else s.addTable([head(['Tanggal', 'Program', 'Kota', 'Lokasi', 'Bantuan', 'PM', 'Status']), ...baris.slice(i * perHal, (i + 1) * perHal)], { x: 0.6, y: 1.6, w: 12.1, colW: [1.2, 1.1, 1.9, 4.0, 1.5, 0.9, 1.5], border: { type: 'solid', color: GARIS, pt: 1 }, fill: { color: 'FFFFFF' }, fontFace: 'Calibri', valign: 'middle' })
  }

  await p.writeFile({ fileName: `Rekap_Aksi_${nama}_${mulai}.pptx` })
}
