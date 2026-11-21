import { supabase } from '@/lib/supabase'
import { loadLib } from '@/lib/loadlib'
import { mapsLink, iso, labelStatus } from '@/lib/util'
import { peserta } from '@/lib/relawan'

export function unduhBlob(blob, nama) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nama
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

export const namaAman = (s) => String(s || 'data').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'data'

export async function signedUrl(path) {
  const { data, error } = await supabase.storage.from('dokumen_santri').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function unduhDokumen(d) {
  const r = await fetch(await signedUrl(d.path))
  if (!r.ok) throw new Error('Dokumen tidak bisa diunduh')
  unduhBlob(await r.blob(), d.nama)
}

// ---------- Excel ----------
const tgl = () => new Date().toISOString().slice(0, 10)
const petaOf = (r) => (r.latitude != null && r.longitude != null ? mapsLink(r.latitude, r.longitude) : r.lokasi_maps || '')

export async function excelWorkbook(sheets, namaFile) {
  const X = await loadLib('xlsx')
  const wb = X.utils.book_new()
  sheets.forEach(({ nama, data }) => {
    const rows = data.length ? data : [{ Keterangan: 'Tidak ada data' }]
    const ws = X.utils.json_to_sheet(rows)
    const kolom = Object.keys(rows[0])
    ws['!cols'] = kolom.map((k) => ({ wch: Math.min(48, Math.max(k.length + 2, ...rows.slice(0, 50).map((r) => String(r[k] ?? '').split('\n')[0].length + 2))) }))
    X.utils.book_append_sheet(wb, ws, nama.slice(0, 31))
  })
  const out = X.write(wb, { bookType: 'xlsx', type: 'array' })
  unduhBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), namaFile)
}

export const barisAset = (a) => ({
  'Sumber data': a.dari_pengajuan ? 'Pengajuan relawan (baru)' : 'Data lama (impor)',
  'Nama aset': a.nama, Kota: a.kota, Cluster: a.cluster, Program: a.program, 'Penerima manfaat': a.jumlah_pm,
  'Beras (kg/hari)': a.kg_beras_per_hari, PIC: a.pic, 'No WhatsApp': a.no_hp, Pimpinan: a.pimpinan, Alamat: a.alamat,
  'Tahun perolehan aset': a.tahun_aset, 'Tahun pembaruan aset': a.tahun_pembaruan, Status: a.status, 'Sudah implementasi': a.sudah_implementasi ? 'Ya' : 'Belum',
  'Implementasi terakhir': a.implementasi_terakhir, Latitude: a.latitude, Longitude: a.longitude, 'Link Google Maps': petaOf(a),
  Story: a.story, Rekomendasi: a.rekomendasi, Keterangan: a.keterangan,
  'Link dokumentasi': a.link_dokumentasi, 'Link foto': (a.foto_urls || []).join('\n'), 'Dokumen santri (nama file)': (a.dokumen_santri || []).map((d) => d.nama).join('\n'),
})

export const barisPengajuan = (p) => ({
  Waktu: new Date(p.dibuat_pada).toLocaleString('id-ID'), Status: p.status, Program: p.program,
  'Nama pengaju': p.nama_pengaju, 'No telp': p.no_telp, Organisasi: p.organisasi, 'Alamat pengaju': p.alamat_pengaju,
  'Nama pondok / panti': p.nama_pondok, Jenis: p.jenis, Kota: p.kota, 'Alamat pondok': p.alamat_pondok,
  'Jumlah santri & pengurus': p.jumlah_penghuni, Pimpinan: p.pimpinan, 'Beras (kg/hari)': p.konsumsi_beras_kg,
  Kategori: p.kategori, Story: p.story, Rekomendasi: p.rekomendasi, 'Link Google Maps': petaOf(p),
  'Link foto': (p.foto_urls || []).join('\n'), 'Dokumen santri (nama file)': (p.dokumen_santri || []).map((d) => d.nama).join('\n'),
})

export const barisAksi = (j) => ({
  Tanggal: j.tanggal, Program: j.program, Kota: j.kota, Lokasi: j.lokasi, 'Sumber dana': j.sumber_dana, Pelaksana: j.pelaksana,
  Jejaring: j.jejaring, 'Jumlah bantuan': j.jumlah_bantuan, Satuan: j.satuan, 'Jumlah PM': j.jumlah_pm, Segmentasi: j.segmentasi,
  Armada: j.armada, 'PIC / Driver': j.pic_driver, Status: labelStatus(j, iso(new Date())),
  'Kategori kendala': j.kendala_kategori, 'Alasan / kendala': j.kendala_alasan,
  'Jumlah relawan': peserta(j).length, Relawan: peserta(j).join('; '),
})

export const excelAset = (rows) => excelWorkbook([{ nama: 'Aset', data: rows.map(barisAset) }], `Data_Aset_Pangan_${tgl()}.xlsx`)
export const excelPengajuan = (rows) => excelWorkbook([{ nama: 'Pengajuan', data: rows.map(barisPengajuan) }], `Pengajuan_Aset_${tgl()}.xlsx`)
export const excelJadwal = (rows, namaFile) => excelWorkbook([{ nama: 'Jadwal aksi', data: rows.map(barisAksi) }], namaFile)
export const excelRows = (data, sheet, namaFile) => excelWorkbook([{ nama: sheet, data }], namaFile)

// ---------- profil (untuk Word dan ZIP) ----------
export function profilAset(a) {
  return {
    nama: a.nama, judul: `Profil Aset: ${a.nama}`,
    baris: [['Program', a.program], ['Kota', a.kota], ['Jenis / cluster', a.cluster], ['Alamat', a.alamat], ['Pimpinan', a.pimpinan],
      ['Jumlah penerima manfaat', a.jumlah_pm], ['Konsumsi beras (kg/hari)', a.kg_beras_per_hari], ['PIC', a.pic], ['No. WhatsApp', a.no_hp],
      ['Tahun perolehan aset', a.tahun_aset], ['Tahun pembaruan aset', a.tahun_pembaruan], ['Status implementasi', a.sudah_implementasi ? 'Sudah terimplementasi' : 'Belum'], ['Titik lokasi', petaOf(a)], ['Link dokumentasi', a.link_dokumentasi]],
    story: a.story, rekomendasi: a.rekomendasi, keterangan: a.keterangan, foto_urls: a.foto_urls || [], dokumen: a.dokumen_santri || [],
  }
}

export function profilPengajuan(p) {
  return {
    nama: p.nama_pondok, judul: `Pengajuan Aset: ${p.nama_pondok}`,
    baris: [['Program', p.program], ['Jenis lembaga', p.jenis], ['Kota', p.kota], ['Alamat', p.alamat_pondok], ['Pimpinan', p.pimpinan],
      ['Jumlah santri & pengurus', p.jumlah_penghuni], ['Konsumsi beras (kg/hari)', p.konsumsi_beras_kg], ['Kategori santri', p.kategori],
      ['Nama pengaju', p.nama_pengaju], ['No. telp pengaju', p.no_telp], ['Organisasi', p.organisasi], ['Alamat pengaju', p.alamat_pengaju],
      ['Titik lokasi', petaOf(p)], ['Diajukan pada', new Date(p.dibuat_pada).toLocaleString('id-ID')]],
    story: p.story, rekomendasi: p.rekomendasi, foto_urls: p.foto_urls || [], dokumen: p.dokumen_santri || [],
  }
}

// ---------- Word ----------
async function ambilGambar(url) {
  try {
    const r = await fetch(url)
    const b = await r.blob()
    const bmp = await createImageBitmap(b)
    return { data: new Uint8Array(await b.arrayBuffer()), w: bmp.width, h: bmp.height, type: b.type.includes('png') ? 'png' : 'jpg' }
  } catch { return null }
}

export async function buatDocx(rec) {
  const D = await loadLib('docx')
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun, HeadingLevel } = D
  const teks = (t) => String(t).split('\n').map((l) => new Paragraph({ children: [new TextRun(l)] }))
  const sel = (t, bold, w) => new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: String(t), bold })] })] })
  const baris = rec.baris.filter(([, v]) => v !== null && v !== undefined && v !== '')
  const anak = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: rec.judul, bold: true })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: baris.map(([l, v]) => new TableRow({ children: [sel(l, true, 35), sel(v, false, 65)] })) }),
  ]
  const bagian = (judul, isi) => { if (isi) anak.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300 }, children: [new TextRun(judul)] }), ...teks(isi)) }
  bagian('Latar belakang / story', rec.story)
  bagian('Rekomendasi / keterangan tambahan', rec.rekomendasi)
  bagian('Keterangan', rec.keterangan)
  const fotos = (await Promise.all((rec.foto_urls || []).map(ambilGambar))).filter(Boolean)
  if (fotos.length) {
    anak.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300 }, children: [new TextRun('Dokumentasi foto')] }))
    fotos.forEach((f) => anak.push(new Paragraph({ spacing: { after: 160 }, children: [new ImageRun({ data: f.data, type: f.type, transformation: { width: 420, height: Math.round((420 * f.h) / f.w) } })] })))
  }
  if (rec.dokumen && rec.dokumen.length) {
    anak.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300 }, children: [new TextRun('Dokumen data santri (ada di paket ZIP)')] }))
    rec.dokumen.forEach((d) => anak.push(new Paragraph({ children: [new TextRun(`- ${d.nama}`)] })))
  }
  return Packer.toBlob(new Document({ sections: [{ children: anak }] }))
}

export async function unduhDocx(rec) {
  unduhBlob(await buatDocx(rec), `Profil_${namaAman(rec.nama)}.docx`)
}

// ---------- ZIP: profil Word + foto + dokumen santri (siap diunggah ke Google Drive) ----------
export async function unduhPaket(rec) {
  const JSZip = await loadLib('jszip')
  const nama = namaAman(rec.nama)
  const zip = new JSZip()
  zip.file(`${nama}/Profil_${nama}.docx`, await buatDocx(rec))
  await Promise.all((rec.foto_urls || []).map(async (u, i) => {
    try { zip.file(`${nama}/foto/foto-${i + 1}.jpg`, await (await fetch(u)).blob()) } catch { /* lewati foto yang gagal */ }
  }))
  await Promise.all((rec.dokumen || []).map(async (d, i) => {
    try {
      const b = await (await fetch(await signedUrl(d.path))).blob()
      zip.file(`${nama}/dokumen_santri/${i + 1}-${namaAman(d.nama.replace(/\.[^.]+$/, ''))}.${(d.path.split('.').pop() || 'bin')}`, b)
    } catch { /* lewati dokumen yang gagal */ }
  }))
  unduhBlob(await zip.generateAsync({ type: 'blob' }), `${nama}.zip`)
}
