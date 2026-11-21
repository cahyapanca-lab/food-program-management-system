'use client'
import CrudSederhana from '@/components/CrudSederhana'
import { fmt, sum } from '@/lib/util'

const rp = (n) => (n == null ? '-' : 'Rp ' + fmt(n))
const PROG = ['FFC', 'BUYD', 'Umum']

export default function MitraDana() {
  return (
    <>
      <h1>Mitra &amp; Dana</h1>
      <div className="m">Catat, edit, dan hapus kolaborasi dengan mitra serta dana yang sudah digunakan. Semuanya otomatis masuk ke halaman Laporan sesuai periode.</div>
      <CrudSederhana bisaEdit tabel="kolaborasi" judul="🤝 Kolaborasi mitra"
        fields={[
          { k: 'tanggal', l: 'Tanggal', t: 'date', wajib: true },
          { k: 'mitra', l: 'Nama mitra', wajib: true },
          { k: 'jenis', l: 'Jenis kolaborasi', t: 'select', opsi: ['Pendanaan', 'Logistik / armada', 'SDM / relawan', 'Bahan pangan', 'Publikasi / media', 'Lainnya'] },
          { k: 'program', l: 'Program', t: 'select', opsi: PROG },
          { k: 'nilai', l: 'Nilai kontribusi (Rp, opsional)', t: 'number' },
          { k: 'deskripsi', l: 'Keterangan', t: 'textarea' },
        ]}
        kolom={[{ k: 'tanggal', l: 'Tanggal' }, { k: 'mitra', l: 'Mitra' }, { k: 'jenis', l: 'Jenis' }, { k: 'program', l: 'Program' },
          { l: 'Nilai', f: (r) => rp(r.nilai) }, { k: 'deskripsi', l: 'Keterangan' }]}
        ringkas={(r) => `${r.length} kolaborasi, ${new Set(r.map((x) => x.mitra.trim().toLowerCase())).size} mitra, total nilai ${rp(sum(r, 'nilai'))}`} />
      <CrudSederhana bisaEdit pilahProgram tabel="penggunaan_dana" judul="💰 Penggunaan dana"
        fields={[
          { k: 'tanggal', l: 'Tanggal', t: 'date', wajib: true },
          { k: 'jumlah', l: 'Jumlah (Rp)', t: 'number', wajib: true },
          { k: 'uraian', l: 'Uraian penggunaan', wajib: true },
          { k: 'kategori', l: 'Kategori', t: 'select', opsi: ['Bahan pangan', 'Transportasi / BBM', 'Operasional armada', 'Perlengkapan / alat', 'Konsumsi relawan', 'Dokumentasi', 'Lainnya'] },
          { k: 'sumber', l: 'Sumber dana (donatur / mitra / internal)' },
          { k: 'program', l: 'Program', t: 'select', opsi: PROG },
        ]}
        kolom={[{ k: 'tanggal', l: 'Tanggal' }, { k: 'uraian', l: 'Uraian' }, { k: 'kategori', l: 'Kategori' }, { k: 'sumber', l: 'Sumber' },
          { k: 'program', l: 'Program' }, { l: 'Jumlah', f: (r) => rp(r.jumlah) }]}
        ringkas={(r, fp) => `Total dana digunakan (${fp ? (fp === '_kosong' ? 'tanpa program' : fp) : 'semua data'}): ${rp(sum(r, 'jumlah'))}`} />
    </>
  )
}
