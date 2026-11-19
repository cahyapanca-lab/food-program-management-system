'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fmt, iso, hariKeMinggu, LABEL_MINGGU, RENTANG_MINGGU, STATUS_LABEL } from '@/lib/util'
import Bars from '@/components/Bars'
import PetaSemua from '@/components/PetaSemua'

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const BLN = BULAN.map((b) => b.slice(0, 3))
const fmtTgl = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const rp = (n) => 'Rp ' + fmt(n)
const tglPendek = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

function periodeDari(jenis, off) {
  const now = new Date()
  if (jenis === 'mingguan') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - hariKeMinggu(now.getDay()) + off * 7)
    const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
    return { mulai: iso(s), akhir: iso(e), label: `${fmtTgl(s)} - ${fmtTgl(e)}` }
  }
  if (jenis === 'bulanan') {
    const d = new Date(now.getFullYear(), now.getMonth() + off, 1)
    return { mulai: iso(d), akhir: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)), label: `${BULAN[d.getMonth()]} ${d.getFullYear()}` }
  }
  if (jenis === 'semester') {
    const idx = now.getFullYear() * 2 + (now.getMonth() < 6 ? 0 : 1) + off
    const y = Math.floor(idx / 2), h = idx % 2
    return { mulai: iso(new Date(y, h * 6, 1)), akhir: iso(new Date(y, h * 6 + 6, 0)), label: `Semester ${h + 1} ${y}` }
  }
  const y = now.getFullYear() + off
  return { mulai: iso(new Date(y, 0, 1)), akhir: iso(new Date(y, 12, 0)), label: `Tahun ${y}` }
}

// tren aksi: mingguan per hari, bulanan per minggu, semester/tahunan per bulan
function tren(jenis, mulai, perTanggal) {
  const m = Object.fromEntries((perTanggal || []).map(([t, n]) => [t, n]))
  if (jenis === 'mingguan') {
    return LABEL_MINGGU.map((l, i) => { const [y, mo, d] = mulai.split('-').map(Number); return [l, m[iso(new Date(y, mo - 1, d + i))] || 0] })
  }
  if (jenis === 'bulanan') {
    const v = [0, 0, 0, 0, 0]
    Object.entries(m).forEach(([t, n]) => { v[Math.min(5, Math.ceil(Number(t.slice(8, 10)) / 7)) - 1] += n })
    return v.map((n, i) => [`Minggu ${i + 1}`, n])
  }
  const m0 = Number(mulai.slice(5, 7)) - 1
  const v = Array(jenis === 'tahunan' ? 12 : 6).fill(0)
  Object.entries(m).forEach(([t, n]) => { v[Number(t.slice(5, 7)) - 1 - m0] += n })
  return v.map((n, i) => [BLN[m0 + i], n])
}

function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  async function masuk(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) setErr('Email atau kata sandi salah')
  }
  return (
    <div className="wrap" style={{ maxWidth: 400 }}>
      <Link href="/" className="btn-line" style={{ marginBottom: 14 }}>← Halaman awal</Link>
      <h1>Dashboard Leaders</h1>
      <form className="card" onSubmit={masuk}>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>Kata sandi<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
        <div className="f"><button style={{ width: '100%' }}>Masuk</button></div>
        {err && <div className="err">{err}</div>}
      </form>
    </div>
  )
}

const BAGIAN = ['Umum', 'Aset', 'Aksi / jadwal', 'Kendala', 'To-do', 'Stok alat', 'Mitra & dana', 'Peta']
const LABEL_KOMENTAR = { baru: 'Terkirim', dibaca: 'Sudah dibaca admin', ditanggapi: 'Ditanggapi' }
const wktu = (s) => new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Leaders hanya bisa MENULIS komentar baru dan MEMBACA balasan admin; tidak ada tombol ubah/hapus.
function Komentar({ profil, periode }) {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [bagian, setBagian] = useState('Umum')
  const [isi, setIsi] = useState('')
  const [busy, setBusy] = useState(false)

  const muat = useCallback(async () => {
    const { data, error } = await supabase.from('komentar_leader').select('*').order('id', { ascending: false }).limit(100)
    if (error) setErr(/komentar_leader/.test(error.message) ? 'Fitur komentar belum aktif. Jalankan migrasi_v9.sql di Supabase.' : error.message)
    else { setErr(''); setRows(data || []) }
  }, [])
  useEffect(() => {
    muat()
    const t = setInterval(muat, 60000)
    return () => clearInterval(t)
  }, [muat])

  async function kirim(e) {
    e.preventDefault(); setMsg('')
    const teks = isi.trim()
    if (!teks) return setErr('Tulis komentar terlebih dahulu')
    setBusy(true)
    const { error } = await supabase.from('komentar_leader').insert({ bagian, isi: teks, periode })
    setBusy(false)
    if (error) return setErr(error.message)
    setIsi(''); setErr(''); setMsg('Komentar terkirim ke admin.'); muat()
  }

  return (
    <>
      <div className="sect"><h2>Komentar &amp; masukan</h2></div>
      <div className="card" style={{ marginTop: 8 }}>
        {profil?.leader ? (
          <form onSubmit={kirim}>
            <div className="m" style={{ marginBottom: 8 }}>Tulis masukan untuk tim admin. Data di dashboard ini hanya bisa dilihat, tidak bisa diubah.</div>
            <label>Bagian yang dikomentari
              <select value={bagian} onChange={(e) => setBagian(e.target.value)}>{BAGIAN.map((b) => <option key={b}>{b}</option>)}</select>
            </label>
            <label>Komentar
              <textarea rows={3} maxLength={2000} value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Contoh: mohon dicek kendala aksi di Cianjur pekan ini" />
            </label>
            <div className="f"><button disabled={busy}>{busy ? 'Mengirim…' : '💬 Kirim komentar'}</button></div>
            {msg && <div className="ok">{msg}</div>}
          </form>
        ) : (
          <div className="m">Kamu masuk sebagai admin (pratinjau). Komentar hanya bisa ditulis oleh leaders; balas komentar di <Link href="/admin/komentar">Admin › Komentar</Link>.</div>
        )}
        {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      </div>

      {rows.length === 0 && !err && <div className="m" style={{ marginTop: 10 }}>Belum ada komentar.</div>}
      {rows.map((k) => (
        <div className="kom" key={k.id}>
          <div className="row" style={{ margin: 0 }}>
            <b>{k.leader_nama}</b><span className="m">· {k.bagian}{k.periode ? ` · ${k.periode}` : ''} · {wktu(k.dibuat_pada)}</span>
            <span className="sp" /><span className={`tag ${k.status}`}>{LABEL_KOMENTAR[k.status] || k.status}</span>
          </div>
          <div className="tx">{k.isi}</div>
          {k.balasan && <div className="bl"><b>Balasan admin</b>{k.dibalas_pada ? <span className="m"> · {wktu(k.dibalas_pada)}</span> : null}<div className="tx">{k.balasan}</div></div>}
        </div>
      ))}
    </>
  )
}

function Isi({ user }) {
  const [jenis, setJenis] = useState('bulanan')
  const [off, setOff] = useState(0)
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [profil, setProfil] = useState(null)
  const per = useMemo(() => periodeDari(jenis, off), [jenis, off])

  useEffect(() => {
    supabase.rpc('profil_leader').then(({ data }) => setProfil(data || null))
  }, [user?.id])

  useEffect(() => {
    let batal = false
    const muat = async () => {
      const { data, error } = await supabase.rpc('data_leader', { p_mulai: per.mulai, p_akhir: per.akhir })
      if (batal) return
      if (error) setErr(error.message.includes('data_leader') ? 'Fungsi data_leader belum ada di Supabase. Jalankan migrasi_v9.sql.' : error.message)
      else { setErr(''); setD(data) }
    }
    setD(null); muat()
    const t = setInterval(muat, 60000)
    return () => { batal = true; clearInterval(t) }
  }, [per.mulai, per.akhir])

  const a = d?.aksi, as = d?.aset
  const kpi = d ? [
    ['Total aset', fmt(as.total)], ['Penerima manfaat', fmt(as.pm)], ['Aksi terlaksana', `${a.terlaksana} / ${a.total}`],
    ['Aksi terkendala', a.terkendala, a.terkendala ? 'var(--r)' : undefined], ['Total porsi (FFC)', fmt(a.porsi)], ['Beras (kg, BUYD)', fmt(a.kg)],
    ['Dana digunakan', rp(d.dana.total)], ['Mitra terlibat', d.mitra.unik],
  ] : []

  return (
    <div className="wrap">
      <div className="hero">
        <div>
          <h1>Dashboard Leaders</h1>
          <div>Program Pangan - Sekolah Relawan (BUYD &amp; FFC)</div>
          <div className="hd">{profil?.nama ? `${profil.nama} · ` : ''}{user?.email}</div>
        </div>
        <div className="f" style={{ margin: 0 }}><button onClick={() => supabase.auth.signOut()}>Keluar</button></div>
      </div>

      <div className="card">
        <div className="f" style={{ margin: 0 }}>
          <select value={jenis} onChange={(e) => { setJenis(e.target.value); setOff(0) }}>
            <option value="mingguan">Mingguan ({RENTANG_MINGGU})</option><option value="bulanan">Bulanan</option>
            <option value="semester">Per 6 bulan</option><option value="tahunan">Tahunan</option>
          </select>
          <button className="sec" onClick={() => setOff((o) => o - 1)} aria-label="Periode sebelumnya">◀</button>
          <b style={{ flex: '1 1 auto', textAlign: 'center' }}>{per.label}</b>
          <button className="sec" onClick={() => setOff((o) => o + 1)} aria-label="Periode berikutnya">▶</button>
          {off !== 0 && <button className="sec" onClick={() => setOff(0)}>Periode ini</button>}
        </div>
      </div>

      {err && <div className="err card">{err}</div>}
      {!d && !err && <div className="card m">Memuat…</div>}
      {d && (
        <>
          <div className="grid" style={{ marginTop: 14 }}>
            {kpi.map(([n, v, w]) => <div className="card kpi" key={n}><b style={w ? { color: w } : undefined}>{v}</b><span>{n}</span></div>)}
          </div>

          <div className="grid2">
            <div className="card"><h3>Tren aksi</h3><Bars data={tren(jenis, per.mulai, d.per_tanggal)} /></div>
            <div className="card"><h3>Aksi per kota (8 teratas)</h3><Bars data={d.per_kota} /></div>
          </div>

          <div className="sect"><h2>Perlu perhatian</h2></div>
          <div className="grid2" style={{ marginTop: 8 }}>
            <div className="card">
              <h3>Aksi terkendala ({d.kendala.length})</h3>
              {d.kendala.length === 0 && <div className="ok">✅ Tidak ada kendala pada periode ini.</div>}
              {d.kendala.map((k, i) => (
                <div className="row" key={i} style={{ display: 'block' }}>
                  <b>{k.lokasi}</b> <span className="m">{tglPendek(k.tanggal)}{k.kota ? ` · ${k.kota}` : ''}</span>
                  <div className="m">{STATUS_LABEL[k.status] || k.status}{k.kategori ? ` · ${k.kategori}` : ''}{k.alasan ? ` - ${k.alasan}` : ''}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3>To-do terlambat ({d.tugas.terlambat})</h3>
              {d.tugas_terlambat.length === 0 && <div className="ok">✅ Tidak ada to-do terlambat.</div>}
              {d.tugas_terlambat.map((t, i) => (
                <div className="row" key={i} style={{ display: 'block' }}><b>{t.judul}</b><div className="m">{t.pj || 'Tanpa PJ'} · tenggat {tglPendek(t.tenggat)}</div></div>
              ))}
              <div className="m" style={{ marginTop: 8 }}>Sedang dikerjakan {d.tugas.proses} · menunggu {d.tugas.menunggu} · selesai pada periode {d.tugas.selesai}</div>
            </div>
            <div className="card">
              <h3>Stok alat ({d.alat.perhatian} perlu perhatian)</h3>
              {d.alat_perhatian.length === 0 && <div className="ok">✅ Semua alat yang dicek dalam kondisi aman.</div>}
              {d.alat_perhatian.map((x, i) => (
                <div className="row" key={i} style={{ display: 'block' }}><b>{x.nama}</b><div className="m">Baik {x.baik} · rusak {x.rusak} · hilang {x.hilang}{x.standar != null ? ` · standar ${x.standar}` : ''}</div></div>
              ))}
              {d.alat.belum_dicek > 0 && <div className="m" style={{ marginTop: 8 }}>{d.alat.belum_dicek} alat belum pernah dicek</div>}
            </div>
          </div>

          <div className="sect"><h2>Mitra &amp; dana</h2></div>
          <div className="grid2" style={{ marginTop: 8 }}>
            <div className="card">
              <h3>Kolaborasi mitra ({d.mitra.jumlah})</h3>
              <div className="m">Nilai kontribusi: <b>{rp(d.mitra.nilai)}</b></div>
              {d.mitra_daftar.length === 0 && <div className="m">Belum ada kolaborasi pada periode ini.</div>}
              {d.mitra_daftar.map((m, i) => <div className="row" key={i}><b>{m.mitra}</b>&nbsp;<span className="m">{m.jenis || ''}{m.nilai ? ` · ${rp(m.nilai)}` : ''}</span></div>)}
            </div>
            <div className="card">
              <h3>Dana per kategori (Rp)</h3>
              <Bars data={d.dana_kategori.map(([k, n]) => [k, Number(n)])} />
              <div className="m" style={{ marginTop: 8 }}>{d.dana.transaksi} transaksi · total {rp(d.dana.total)}</div>
            </div>
          </div>

          <div className="sect"><h2>Peta sebaran aset</h2></div>
          <div className="card" style={{ marginTop: 8 }}>
            <PetaSemua height={340} items={d.titik.map((t) => ({
              id: t.id, lat: t.lat, lng: t.lng, title: t.nama, program: t.program, sub: `${t.kota || ''}${t.pm ? ' - ' + t.pm + ' PM' : ''}`,
            }))} />
            <div className="m" style={{ marginTop: 8 }}>{d.titik.length} dari {as.total} aset punya titik lokasi · {as.ffc} FFC · {as.buyd} BUYD · {as.implementasi} sudah implementasi · {as.baru} aset baru pada periode ini</div>
          </div>
        </>
      )}

      <Komentar profil={profil} periode={per.label} />
    </div>
  )
}

export default function Leaders() {
  const [ses, setSes] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSes(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSes(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (ses === undefined) return <div className="wrap">Memuat…</div>
  if (!ses) return <Login />
  return <Isi user={ses.user} />
}
