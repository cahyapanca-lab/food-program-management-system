'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'
import { iso } from '@/lib/util'
import BelAdmin from '@/components/BelAdmin'
import { IkonRumah, IkonMenu, IkonTutup } from '@/components/Ikon'

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
      <h1>Admin Program Pangan</h1>
      <form className="card" onSubmit={masuk}>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>Kata sandi<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
        <div className="f"><button style={{ width: '100%' }}>Masuk</button></div>
        {err && <div className="err">{err}</div>}
      </form>
    </div>
  )
}

function Nav() {
  const path = usePathname()
  const [buka, setBuka] = useState(false)
  useEffect(() => { setBuka(false) }, [path])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && setBuka(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  const { rows: pengajuan } = useTable('pengajuan', { order: 'id' })
  const { rows: tugas } = useTable('tugas', { order: 'id' })
  const { rows: jadwal } = useTable('jadwal_aksi', { order: 'tanggal' })
  const baru = pengajuan.filter((p) => p.status === 'baru').length
  const telat = tugas.filter((t) => t.status !== 'selesai' && t.tenggat && t.tenggat < iso(new Date())).length
  const items = [['/admin', 'Dashboard'], ['/admin/aset', 'Data Aset'], ['/admin/pengajuan', 'Pengajuan'], ['/admin/jadwal', 'Jadwal'], ['/admin/mitra-dana', 'Mitra & Dana'], ['/admin/opname', 'Stok Alat'], ['/admin/tugas', 'To-do'], ['/admin/relawan', 'Relawan'], ['/admin/laporan', 'Laporan']]
  const aktif = (items.find(([h]) => h === path) || ['', 'Admin'])[1]
  const lencana = (href) => (<>{href === '/admin/pengajuan' && baru > 0 && <span className="badge">{baru}</span>}{href === '/admin/tugas' && telat > 0 && <span className="badge">{telat}</span>}</>)
  return (
    <nav className="nav">
      <Link href="/" className="ib" aria-label="Kembali ke halaman awal" title="Halaman awal"><IkonRumah /></Link>
      <span className="menu-judul">{aktif}</span>
      <div className="tabs-scroll">
        {items.map(([href, nama]) => (
          <Link key={href} href={href} className={`tab${path === href ? ' on' : ''}`}>
            {nama}{href === '/admin/pengajuan' && baru > 0 && <span className="badge">{baru}</span>}{href === '/admin/tugas' && telat > 0 && <span className="badge">{telat}</span>}
          </Link>
        ))}
      </div>
      <BelAdmin jadwal={jadwal} tugas={tugas} pengajuan={pengajuan} />
      <button type="button" className="ib menu-btn" aria-label={buka ? 'Tutup menu' : 'Buka menu'} aria-expanded={buka} onClick={() => setBuka((v) => !v)}>{buka ? <IkonTutup /> : <IkonMenu />}</button>
      <button className="sec keluar-desk" onClick={() => supabase.auth.signOut()}>Keluar</button>
      {buka && (
        <>
          <div className="menu-back" onClick={() => setBuka(false)} />
          <div className="menu-panel">
            {items.map(([href, nama]) => (
              <Link key={href} href={href} className={path === href ? 'on' : ''} onClick={() => setBuka(false)}><span>{nama}</span>{lencana(href)}</Link>
            ))}
            <button type="button" className="sec" onClick={() => supabase.auth.signOut()}>Keluar</button>
          </div>
        </>
      )}
    </nav>
  )
}

export default function AdminLayout({ children }) {
  const [ses, setSes] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSes(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSes(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (ses === undefined) return <div className="wrap">Memuat…</div>
  if (!ses) return <Login />
  return (<><Nav /><div className="wrap">{children}</div></>)
}
