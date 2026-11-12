'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTable } from '@/lib/useTable'

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
    <div className="wrap" style={{ maxWidth: 380 }}>
      <h1>Admin Program Pangan</h1>
      <form className="card" onSubmit={masuk}>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Kata sandi<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        <div className="f"><button>Masuk</button></div>
        {err && <div className="err">{err}</div>}
      </form>
    </div>
  )
}

function Nav() {
  const path = usePathname()
  const { rows } = useTable('pengajuan', { order: 'id' })
  const baru = rows.filter((p) => p.status === 'baru').length
  const items = [['/admin', 'Dashboard'], ['/admin/aset', 'Data Aset'], ['/admin/pengajuan', 'Pengajuan'], ['/admin/jadwal', 'Jadwal Aksi']]
  return (
    <nav className="nav">
      {items.map(([href, nama]) => (
        <Link key={href} href={href} className={path === href ? 'on' : ''}>
          {nama}{href === '/admin/pengajuan' && baru > 0 && <span className="badge">{baru}</span>}
        </Link>
      ))}
      <span className="sp" />
      <Link href="/relawan">Halaman relawan</Link>
      <button className="sec" onClick={() => supabase.auth.signOut()}>Keluar</button>
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
