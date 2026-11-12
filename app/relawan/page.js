'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadFoto } from '@/lib/storage'
import { compressImage, mapsLink } from '@/lib/util'
import JadwalBulan from '@/components/JadwalBulan'

const AWAL = {
  program: 'BUYD', nama_pengaju: '', no_telp: '', organisasi: '', alamat_pengaju: '',
  nama_pondok: '', jenis: 'Pondok pesantren', kota: '', alamat_pondok: '', jumlah_penghuni: '',
  pimpinan: '', konsumsi_beras_kg: '', kategori: '', story: '', lokasi_maps: '', website: '',
}

export default function Relawan() {
  const [f, setF] = useState(AWAL)
  const [fotos, setFotos] = useState([null, null, null, null, null])
  const [loc, setLoc] = useState(null)
  const [locMsg, setLocMsg] = useState('')
  const [locBusy, setLocBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [jadwal, setJadwal] = useState([])

  useEffect(() => {
    supabase.from('jadwal_aksi')
      .select('id,tanggal,program,kota,lokasi,jumlah_bantuan,satuan,jumlah_pm,segmentasi,selesai')
      .order('tanggal').then(({ data }) => setJadwal(data || []))
  }, [])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function pilihFoto(i, e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    const kecil = await compressImage(file)
    setFotos((cur) => cur.map((x, k) => (k === i ? { file: kecil, url: URL.createObjectURL(kecil) } : x)))
  }
  const hapusFoto = (i) => setFotos((cur) => cur.map((x, k) => (k === i ? null : x)))

  function ambilLokasi() {
    setLocMsg('')
    if (!navigator.geolocation) return setLocMsg('Browser ini tidak mendukung GPS. Tempel link Google Maps di bawah.')
    setLocBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); setLocBusy(false) },
      () => { setLocMsg('Lokasi tidak bisa diambil. Izinkan akses lokasi di browser, atau tempel link Google Maps di bawah.'); setLocBusy(false) },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function kirim(e) {
    e.preventDefault()
    setMsg('')
    const terpilih = fotos.filter(Boolean)
    if (terpilih.length < 1) return setMsg('Tambahkan minimal 1 foto dokumentasi.')
    if (!loc && !f.lokasi_maps.trim()) return setMsg('Ambil titik lokasi atau tempel link Google Maps.')
    setBusy(true)
    try {
      const urls = []
      for (const x of terpilih) urls.push(await uploadFoto('pengajuan', x.file))
      const num = (v) => (v === '' ? null : Number(v))
      const row = {
        ...f,
        jumlah_penghuni: num(f.jumlah_penghuni),
        konsumsi_beras_kg: num(f.konsumsi_beras_kg),
        foto_urls: urls,
        latitude: loc ? loc.lat : null,
        longitude: loc ? loc.lng : null,
        lokasi_maps: f.lokasi_maps.trim() || (loc ? mapsLink(loc.lat, loc.lng) : null),
      }
      const { error } = await supabase.from('pengajuan').insert(row)
      if (error) throw error

      const hook = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK
      if (hook) {
        fetch(hook, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ ...row, foto_urls: urls.join('\n') }) }).catch(() => {})
      }
      setMsg('ok'); setF(AWAL); setFotos([null, null, null, null, null]); setLoc(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setMsg('Gagal mengirim: ' + (err.message || 'coba lagi'))
    }
    setBusy(false)
  }

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <h1>Form Pengajuan BUYD / FFC</h1>
      <p className="m">Sekolah Relawan - Program Pangan</p>
      {msg === 'ok' && <div className="card ok">✅ Terima kasih! Pengajuan sudah terkirim ke tim Program Pangan.</div>}

      <form className="card" onSubmit={kirim}>
        <h2>Data Pengaju</h2>
        <label>Nama pengaju<input required value={f.nama_pengaju} onChange={set('nama_pengaju')} maxLength={120} /></label>
        <label>No. Telp / WhatsApp<input required inputMode="tel" value={f.no_telp} onChange={set('no_telp')} maxLength={20} /></label>
        <label>Nama organisasi<input value={f.organisasi} onChange={set('organisasi')} maxLength={150} /></label>
        <label>Alamat pengaju<textarea rows={2} value={f.alamat_pengaju} onChange={set('alamat_pengaju')} maxLength={400} /></label>

        <h2 style={{ marginTop: 22 }}>Data Pondok / Panti</h2>
        <label>Program yang diajukan
          <select value={f.program} onChange={set('program')}>
            <option value="BUYD">BUYD - Beras Untuk Yatim Dhuafa</option>
            <option value="FFC">FFC - Free Food Car</option>
          </select>
        </label>
        <label>Jenis lembaga
          <select value={f.jenis} onChange={set('jenis')}>
            <option>Pondok pesantren</option><option>Panti asuhan</option><option>Komunitas / kampung</option><option>Lainnya</option>
          </select>
        </label>
        <label>Nama pondok / panti<input required value={f.nama_pondok} onChange={set('nama_pondok')} maxLength={150} /></label>
        <label>Kota / Kabupaten<input required value={f.kota} onChange={set('kota')} maxLength={80} /></label>
        <label>Alamat lengkap<textarea required rows={3} value={f.alamat_pondok} onChange={set('alamat_pondok')} maxLength={500} /></label>
        <label>Jumlah santri &amp; pengurus<input type="number" min="0" value={f.jumlah_penghuni} onChange={set('jumlah_penghuni')} /></label>
        <label>Pimpinan pondok / panti<input value={f.pimpinan} onChange={set('pimpinan')} maxLength={120} /></label>
        <label>Konsumsi beras (kg / hari)<input type="number" min="0" step="0.1" value={f.konsumsi_beras_kg} onChange={set('konsumsi_beras_kg')} /></label>
        <label>Kategori santri<input value={f.kategori} onChange={set('kategori')} maxLength={200} placeholder="contoh: 80% dhuafa, hampir semua gratis" /></label>
        <label>Kenapa harus dibantu? (story / biografi)<textarea rows={6} value={f.story} onChange={set('story')} maxLength={3000} /></label>

        <h2 style={{ marginTop: 22 }}>Foto Dokumentasi (maks. 5)</h2>
        <div className="m">Di HP, tombol “Kamera” langsung membuka kamera. Minimal 1 foto.</div>
        <div className="thumbs" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))' }}>
          {fotos.map((x, i) => (
            <div className="slot" key={i}>
              {x ? (<><img src={x.url} alt={`foto ${i + 1}`} /><button type="button" className="x" onClick={() => hapusFoto(i)} aria-label="Hapus foto">×</button></>) : (<>
                <label>📷 Kamera<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => pilihFoto(i, e)} /></label>
                <small><label style={{ fontSize: 11, color: 'var(--m)', fontWeight: 400 }}>atau galeri<input type="file" accept="image/*" hidden onChange={(e) => pilihFoto(i, e)} /></label></small>
              </>)}
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 22 }}>Titik Lokasi (Google Maps)</h2>
        <div className="f">
          <button type="button" onClick={ambilLokasi} disabled={locBusy}>{locBusy ? 'Mengambil lokasi…' : '📍 Ambil lokasi saya sekarang'}</button>
        </div>
        <div className="m">Lakukan ini saat berada di lokasi pondok / panti, dan izinkan akses lokasi.</div>
        {locMsg && <div className="err">{locMsg}</div>}
        {loc && (<>
          <div className="ok" style={{ marginTop: 8 }}>Lokasi didapat (akurasi sekitar {loc.acc} m) - <a href={mapsLink(loc.lat, loc.lng)} target="_blank" rel="noreferrer">buka di Google Maps</a></div>
          <iframe className="map" title="Pratinjau lokasi" loading="lazy" src={`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=16&output=embed`} />
        </>)}
        <label>Atau tempel link Google Maps<input value={f.lokasi_maps} onChange={set('lokasi_maps')} placeholder="https://maps.app.goo.gl/…" /></label>

        <input className="hp" tabIndex={-1} autoComplete="off" name="website" value={f.website} onChange={set('website')} aria-hidden="true" />

        <div className="f" style={{ marginTop: 18 }}><button disabled={busy}>{busy ? 'Mengirim… (jangan tutup halaman)' : 'Kirim Pengajuan'}</button></div>
        {msg && msg !== 'ok' && <div className="err">{msg}</div>}
      </form>

      <div className="card">
        <h2>Jadwal Aksi</h2>
        <JadwalBulan events={jadwal} />
      </div>
    </div>
  )
}
