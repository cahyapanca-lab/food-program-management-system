'use client'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fmt, iso, hariKeMinggu, LABEL_MINGGU, RENTANG_MINGGU, STATUS_LABEL, mapsLink } from '@/lib/util'
import Bars from '@/components/Bars'
import PetaSemua from '@/components/PetaSemua'
import JadwalBulan from '@/components/JadwalBulan'
import DetailAksi from '@/components/DetailAksi'

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

const BAGIAN = ['Umum', 'Aset', 'Pengajuan', 'Aksi / jadwal', 'Kendala', 'To-do', 'Stok alat', 'Mitra & dana', 'Peta']
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

// ---- Data lengkap (hanya baca): jadwal aksi, data aset, pengajuan. Semua lewat fungsi database khusus leaders.
function useLeaderData(fn) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let batal = false
    const muat = async () => {
      const { data, error } = await supabase.rpc(fn)
      if (batal) return
      if (error) setErr(error.message.includes(fn) ? `Fungsi ${fn} belum ada di Supabase. Jalankan migrasi_v10.sql.` : error.message)
      else { setErr(''); setRows(Array.isArray(data) ? data : []) }
    }
    muat()
    const t = setInterval(muat, 60000)
    return () => { batal = true; clearInterval(t) }
  }, [fn])
  return { rows, err }
}

const linkPeta = (a) => (a.latitude != null && a.longitude != null ? mapsLink(a.latitude, a.longitude) : a.lokasi_maps || '')
const tglPanjang = (s) => (s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

function Foto({ urls }) {
  if (!urls || urls.length === 0) return null
  return (
    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {urls.slice(0, 10).map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Foto dokumentasi" loading="lazy" style={{ height: 84, borderRadius: 8, border: '1px solid var(--b)' }} /></a>
      ))}
    </div>
  )
}

function Rinci({ baris }) {
  return (
    <dl className="dl">
      {baris.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (<div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>))}
    </dl>
  )
}

function LeaderJadwal() {
  const { rows, err } = useLeaderData('leader_jadwal')
  const [sel, setSel] = useState(null)
  if (err) return <div className="err card" style={{ marginTop: 14 }}>{err}</div>
  if (!rows) return <div className="card m" style={{ marginTop: 14 }}>Memuat…</div>
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="m" style={{ marginBottom: 8 }}>Klik jadwal untuk melihat detail. Tampilan ini hanya untuk dilihat.</div>
      <JadwalBulan events={rows} onEvent={setSel} />
      {sel && <DetailAksi e={sel} close={() => setSel(null)} />}
    </div>
  )
}

function LeaderAset() {
  const { rows, err } = useLeaderData('leader_aset')
  const [q, setQ] = useState('')
  const [prog, setProg] = useState('')
  const [impl, setImpl] = useState('')
  const [mode, setMode] = useState('tabel')
  const [buka, setBuka] = useState(null)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (rows || []).filter((a) => (!prog || a.program === prog)
      && (!impl || (impl === 'ya') === !!a.sudah_implementasi)
      && (!t || [a.nama, a.kota, a.cluster, a.pic, a.pimpinan].some((v) => (v || '').toLowerCase().includes(t))))
  }, [rows, q, prog, impl])
  if (err) return <div className="err card" style={{ marginTop: 14 }}>{err}</div>
  if (!rows) return <div className="card m" style={{ marginTop: 14 }}>Memuat…</div>
  const titik = list.filter((a) => a.latitude != null && a.longitude != null)
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="f" style={{ margin: 0 }}>
        <input placeholder="Cari nama, kota, cluster, PIC…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 220px' }} />
        <select value={prog} onChange={(e) => setProg(e.target.value)}><option value="">Semua program</option><option value="FFC">FFC</option><option value="BUYD">BUYD</option></select>
        <select value={impl} onChange={(e) => setImpl(e.target.value)}><option value="">Semua implementasi</option><option value="ya">Sudah implementasi</option><option value="belum">Belum implementasi</option></select>
        <button className={mode === 'tabel' ? '' : 'sec'} onClick={() => setMode('tabel')}>Tabel</button>
        <button className={mode === 'peta' ? '' : 'sec'} onClick={() => setMode('peta')}>Peta</button>
      </div>
      <div className="m" style={{ margin: '8px 0' }}>Menampilkan {list.length} dari {rows.length} aset · {list.filter((a) => a.program === 'FFC').length} FFC · {list.filter((a) => a.program === 'BUYD').length} BUYD · {list.filter((a) => a.sudah_implementasi).length} sudah implementasi. Hanya untuk dilihat; nomor telepon dan dokumen santri tidak ditampilkan.</div>
      {mode === 'peta' ? (
        <>
          <PetaSemua height={460} items={titik.map((a) => ({ id: a.id, lat: a.latitude, lng: a.longitude, title: a.nama, program: a.program, sub: `${a.kota || ''}${a.jumlah_pm ? ' - ' + a.jumlah_pm + ' PM' : ''}` }))} />
          <div className="m" style={{ marginTop: 8 }}>{titik.length} dari {list.length} aset punya titik lokasi.</div>
        </>
      ) : (
        <div className="sc"><table>
          <thead><tr><th>Nama</th><th>Kota</th><th>Cluster</th><th>Program</th><th>PM</th><th>Beras kg/hari</th><th>PIC</th><th>Status</th><th>Tahun</th><th>Implementasi</th><th>Peta</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <Fragment key={a.id}>
                <tr style={{ cursor: 'pointer' }} onClick={() => setBuka(buka === a.id ? null : a.id)}>
                  <td>{buka === a.id ? '▾ ' : '▸ '}{a.nama}{a.dari_pengajuan && <span className="badge">baru</span>}</td>
                  <td>{a.kota}</td><td>{a.cluster}</td>
                  <td>{a.program ? <span className={`tag ${a.program}`}>{a.program}</span> : '-'}</td>
                  <td>{a.jumlah_pm ?? '-'}</td><td>{a.kg_beras_per_hari ?? '-'}</td><td>{a.pic || '-'}</td>
                  <td>{a.status === 'perlu_update' ? 'Perlu update' : a.status === 'terbaru' ? 'Terbaru' : '-'}</td>
                  <td>{a.tahun_aset || '-'}{a.tahun_pembaruan ? ` / ${a.tahun_pembaruan}` : ''}</td>
                  <td>{a.sudah_implementasi ? '✅ Sudah' : 'Belum'}</td>
                  <td>{linkPeta(a) ? <a target="_blank" rel="noreferrer" href={linkPeta(a)} onClick={(e) => e.stopPropagation()}>Buka</a> : '-'}</td>
                </tr>
                {buka === a.id && (
                  <tr><td colSpan={11} style={{ whiteSpace: 'normal' }}>
                    <Rinci baris={[
                      ['Alamat', a.alamat], ['Pimpinan', a.pimpinan], ['Keterangan', a.keterangan],
                      ['Implementasi terakhir', a.implementasi_terakhir ? tglPanjang(a.implementasi_terakhir) : ''],
                      ['Cerita / latar belakang', a.story], ['Rekomendasi', a.rekomendasi],
                      ['Titik lokasi', a.titik_perkiraan ? 'Perkiraan (otomatis)' : ''],
                    ]} />
                    <Foto urls={a.foto_urls} />
                  </td></tr>
                )}
              </Fragment>
            ))}
            {list.length === 0 && <tr><td colSpan={11} className="m" style={{ textAlign: 'center', padding: 24 }}>Tidak ada aset yang cocok.</td></tr>}
          </tbody>
        </table></div>
      )}
    </div>
  )
}

const STATUS_PGJ = { baru: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak' }
const TAG_PGJ = { baru: 'baru', disetujui: 'ditanggapi', ditolak: 'dibaca' }

function LeaderPengajuan() {
  const { rows, err } = useLeaderData('leader_pengajuan')
  const [st, setSt] = useState('baru')
  const [q, setQ] = useState('')
  const [buka, setBuka] = useState(null)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (rows || []).filter((p) => (!st || p.status === st)
      && (!t || [p.nama_pondok, p.kota, p.jenis, p.nama_pengaju, p.organisasi].some((v) => (v || '').toLowerCase().includes(t))))
  }, [rows, st, q])
  if (err) return <div className="err card" style={{ marginTop: 14 }}>{err}</div>
  if (!rows) return <div className="card m" style={{ marginTop: 14 }}>Memuat…</div>
  const n = (s) => rows.filter((p) => p.status === s).length
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="f" style={{ margin: 0 }}>
        {[['baru', `Menunggu (${n('baru')})`], ['disetujui', `Disetujui (${n('disetujui')})`], ['ditolak', `Ditolak (${n('ditolak')})`], ['', `Semua (${rows.length})`]].map(([v, l]) => (
          <button key={v || 'semua'} className={st === v ? '' : 'sec'} onClick={() => setSt(v)}>{l}</button>
        ))}
        <input placeholder="Cari pondok, kota, pengaju…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 220px' }} />
      </div>
      <div className="m" style={{ margin: '8px 0' }}>Hanya untuk dilihat. Persetujuan dilakukan admin; nomor telepon dan dokumen santri tidak ditampilkan.</div>
      <div className="sc"><table>
        <thead><tr><th>Tanggal</th><th>Pondok / panti</th><th>Kota</th><th>Jenis</th><th>Program</th><th>Penghuni</th><th>Pengaju</th><th>Status</th></tr></thead>
        <tbody>
          {list.map((p) => (
            <Fragment key={p.id}>
              <tr style={{ cursor: 'pointer' }} onClick={() => setBuka(buka === p.id ? null : p.id)}>
                <td>{tglPanjang(p.dibuat_pada)}</td>
                <td>{buka === p.id ? '▾ ' : '▸ '}{p.nama_pondok}</td>
                <td>{p.kota || '-'}</td><td>{p.jenis || '-'}</td>
                <td><span className={`tag ${p.program}`}>{p.program}</span></td>
                <td>{p.jumlah_penghuni ?? '-'}</td>
                <td>{p.nama_pengaju}{p.organisasi ? ` (${p.organisasi})` : ''}</td>
                <td><span className={`tag ${TAG_PGJ[p.status] || ''}`}>{STATUS_PGJ[p.status] || p.status}</span></td>
              </tr>
              {buka === p.id && (
                <tr><td colSpan={8} style={{ whiteSpace: 'normal' }}>
                  <Rinci baris={[
                    ['Alamat pondok', p.alamat_pondok], ['Pimpinan', p.pimpinan],
                    ['Konsumsi beras (kg)', p.konsumsi_beras_kg], ['Kategori', p.kategori],
                    ['Cerita / latar belakang', p.story], ['Rekomendasi', p.rekomendasi],
                  ]} />
                  {linkPeta(p) && <div style={{ marginTop: 6 }}><a target="_blank" rel="noreferrer" href={linkPeta(p)}>Buka lokasi di peta</a></div>}
                  <Foto urls={p.foto_urls} />
                </td></tr>
              )}
            </Fragment>
          ))}
          {list.length === 0 && <tr><td colSpan={8} className="m" style={{ textAlign: 'center', padding: 24 }}>Tidak ada pengajuan.</td></tr>}
        </tbody>
      </table></div>
    </div>
  )
}

function Isi({ user }) {
  const [jenis, setJenis] = useState('bulanan')
  const [off, setOff] = useState(0)
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [profil, setProfil] = useState(null)
  const [tab, setTab] = useState('ringkasan')
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

      <div className="f">
        {[['ringkasan', '📊 Ringkasan'], ['jadwal', '🗓 Jadwal aksi'], ['aset', '🏠 Data aset'], ['pengajuan', '📝 Pengajuan']].map(([v, l]) => (
          <button key={v} className={tab === v ? '' : 'sec'} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {tab === 'jadwal' && <LeaderJadwal />}
      {tab === 'aset' && <LeaderAset />}
      {tab === 'pengajuan' && <LeaderPengajuan />}

      {tab === 'ringkasan' && (<>
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
      </>)}

      <Komentar profil={profil} periode={tab === 'ringkasan' ? per.label : null} />
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
