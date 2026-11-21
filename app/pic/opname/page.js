'use client'
import CrudSederhana from '@/components/CrudSederhana'
import { useTable } from '@/lib/useTable'

export default function Opname() {
  const { rows: alat } = useTable('alat')
  const { rows: opn } = useTable('opname', { order: 'tanggal', asc: false })
  const nama = Object.fromEntries(alat.map((a) => [a.id, a.nama]))
  const terakhir = alat.map((a) => ({
    a, o: opn.filter((x) => x.alat_id === a.id).sort((p, q) => q.tanggal.localeCompare(p.tanggal) || q.id - p.id)[0],
  }))

  return (
    <>
      <h1>Stock Opname Alat</h1>
      <div className="m">Catat kondisi alat Program Pangan secara harian, mingguan, atau bulanan. Setiap catatan otomatis masuk ke halaman Laporan.</div>
      <div className="card">
        <h2>Kondisi terakhir</h2>
        <div className="sc"><table>
          <thead><tr><th>Alat</th><th>Dicek terakhir</th><th>Periode</th><th>Baik</th><th>Rusak</th><th>Hilang</th><th>Standar</th><th>Status</th></tr></thead>
          <tbody>
            {terakhir.length === 0 && <tr><td colSpan={8} className="m">Belum ada alat. Tambahkan di bagian Daftar alat di bawah.</td></tr>}
            {terakhir.map(({ a, o }) => (
              <tr key={a.id}>
                <td>{a.nama}</td>
                {o ? (<>
                  <td>{o.tanggal}</td><td>{o.periode}</td><td>{o.jumlah_baik}</td><td>{o.jumlah_rusak}</td><td>{o.jumlah_hilang}</td><td>{a.jumlah_standar ?? '-'}</td>
                  <td>{o.jumlah_rusak + o.jumlah_hilang > 0 || (a.jumlah_standar != null && o.jumlah_baik < a.jumlah_standar) ? '⚠ Perlu perhatian' : '✅ Aman'}</td>
                </>) : <td colSpan={7} className="m">Belum pernah dicek</td>}
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      <CrudSederhana tabel="opname" judul="📋 Catat opname"
        fields={[
          { k: 'alat_id', l: 'Alat', t: 'select', num: true, wajib: true, opsi: alat.map((a) => [a.id, a.nama]) },
          { k: 'periode', l: 'Jenis pengecekan', t: 'select', def: 'harian', wajib: true, opsi: [['harian', 'Harian'], ['mingguan', 'Mingguan'], ['bulanan', 'Bulanan']] },
          { k: 'tanggal', l: 'Tanggal', t: 'date', wajib: true },
          { k: 'jumlah_baik', l: 'Jumlah baik', t: 'number', def: 0, wajib: true },
          { k: 'jumlah_rusak', l: 'Jumlah rusak', t: 'number', def: 0, wajib: true },
          { k: 'jumlah_hilang', l: 'Jumlah hilang', t: 'number', def: 0, wajib: true },
          { k: 'petugas', l: 'Petugas' },
          { k: 'catatan', l: 'Catatan', t: 'textarea' },
        ]}
        kolom={[{ k: 'tanggal', l: 'Tanggal' }, { l: 'Alat', f: (r) => nama[r.alat_id] || '-' }, { k: 'periode', l: 'Jenis' }, { k: 'jumlah_baik', l: 'Baik' },
          { k: 'jumlah_rusak', l: 'Rusak' }, { k: 'jumlah_hilang', l: 'Hilang' }, { k: 'petugas', l: 'Petugas' }, { k: 'catatan', l: 'Catatan' }]} />
      <CrudSederhana tabel="alat" judul="🧰 Daftar alat" order="id"
        konfirmasi="Hapus alat ini? Seluruh riwayat opname alat ini juga akan terhapus."
        fields={[
          { k: 'nama', l: 'Nama alat', wajib: true },
          { k: 'kategori', l: 'Kategori', t: 'select', opsi: ['Dapur / masak', 'Armada / kendaraan', 'Distribusi', 'Kemasan', 'Kebersihan / sanitasi', 'Lainnya'] },
          { k: 'jumlah_standar', l: 'Jumlah seharusnya (stok standar)', t: 'number' },
          { k: 'satuan', l: 'Satuan', def: 'unit' },
          { k: 'lokasi', l: 'Lokasi penyimpanan' },
          { k: 'catatan', l: 'Catatan', t: 'textarea' },
        ]}
        kolom={[{ k: 'nama', l: 'Alat' }, { k: 'kategori', l: 'Kategori' }, { k: 'jumlah_standar', l: 'Standar' }, { k: 'satuan', l: 'Satuan' }, { k: 'lokasi', l: 'Lokasi' }]} />
    </>
  )
}
