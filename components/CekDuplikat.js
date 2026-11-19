'use client'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { normTeks } from '@/lib/util'

const isi = (a) => ['alamat', 'pimpinan', 'jumlah_pm', 'pic', 'no_hp', 'program', 'cluster', 'lokasi_maps', 'story', 'keterangan'].filter((k) => a[k] != null && a[k] !== '').length
  + (a.latitude != null ? 1 : 0) + (a.foto_urls?.length || 0) * 0.5

// Daftar aset ganda + tombol gabungkan (aset dengan data paling lengkap jadi pilihan awal)
export default function CekDuplikat({ rows, reload, tutup }) {
  const grup = useMemo(() => {
    const m = {}
    rows.forEach((a) => { const k = normTeks(a.nama); if (k) (m[k] ||= []).push(a) })
    return Object.entries(m).filter(([, g]) => g.length > 1).map(([key, g]) => ({
      key, g: [...g].sort((x, y) => isi(y) - isi(x) || x.id - y.id), pasti: new Set(g.map((a) => normTeks(a.kota))).size === 1,
    })).sort((a, b) => Number(b.pasti) - Number(a.pasti))
  }, [rows])
  const [keep, setKeep] = useState({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const pilih = (x) => x.g.find((a) => a.id === keep[x.key]) || x.g[0]
  // yang digabung: kota sama, atau salah satunya tanpa kota. Kota berbeda tidak pernah digabung otomatis.
  const kandidat = (x, k) => x.g.filter((a) => a.id !== k.id && (!normTeks(a.kota) || !normTeks(k.kota) || normTeks(a.kota) === normTeks(k.kota)))

  async function gabung(x) {
    const k = pilih(x), hapus = kandidat(x, k)
    if (!hapus.length) return
    if (!confirm(`Gabungkan ${hapus.length} data ke "${k.nama}" (${k.kota || 'tanpa kota'})? Data yang digabung akan dihapus dan tidak bisa dikembalikan.`)) return
    setBusy(true); setMsg('')
    for (const h of hapus) {
      const { error } = await supabase.rpc('gabung_aset', { p_keep: k.id, p_hapus: h.id })
      if (error) { setMsg('Gagal: ' + error.message); break }
    }
    setBusy(false); reload()
  }

  return (
    <div className="card">
      <div className="f" style={{ justifyContent: 'space-between', margin: 0 }}>
        <h2 style={{ margin: 0 }}>Cek data aset ganda</h2>
        <button className="sec" onClick={tutup}>Tutup</button>
      </div>
      <div className="m">Dianggap ganda bila nama sama (abaikan huruf besar/kecil, spasi, dan tanda baca). Pilih data yang dipertahankan, lalu gabungkan.</div>
      {msg && <div className="err">{msg}</div>}
      {grup.length === 0 && <div className="ok" style={{ marginTop: 10 }}>✅ Tidak ditemukan data aset ganda.</div>}
      {grup.map((x) => {
        const k = pilih(x), n = kandidat(x, k).length
        return (
          <div className="card" key={x.key} style={{ marginTop: 10 }}>
            <div className="m"><b>{x.pasti ? 'Pasti ganda' : 'Mirip'}</b>: {x.pasti ? 'nama dan kota sama' : 'nama sama, kota berbeda atau kosong (cek manual)'}</div>
            {x.g.map((a) => (
              <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0', color: 'inherit', fontSize: 14 }}>
                <input type="radio" name={`k-${x.key}`} checked={k.id === a.id} onChange={() => setKeep((c) => ({ ...c, [x.key]: a.id }))} style={{ width: 18, height: 18, padding: 0 }} />
                <span><b>{a.nama}</b> · {a.kota || 'tanpa kota'} · {a.program || '-'} · PM {a.jumlah_pm ?? '-'} · PIC {a.pic || '-'} · {a.foto_urls?.length || 0} foto{a.dari_pengajuan ? ' · dari pengajuan' : ''}</span>
              </label>
            ))}
            <div className="f"><button disabled={busy || n === 0} onClick={() => gabung(x)}>{n ? `Gabungkan ${n} data ke yang dipilih` : 'Tidak ada yang bisa digabung (kota berbeda)'}</button></div>
          </div>
        )
      })}
    </div>
  )
}
