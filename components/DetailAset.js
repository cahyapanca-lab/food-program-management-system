'use client'
import PetaEmbed from '@/components/PetaEmbed'
import DokumenList from '@/components/DokumenList'
import TombolUnduh from '@/components/TombolUnduh'
import { openUrl } from '@/lib/maps'
import { waLink } from '@/lib/util'
import { STATUS_TUGAS } from '@/lib/tugas'
import { profilAset, unduhDocx, unduhPaket } from '@/lib/ekspor'

const kosong = (v) => v === null || v === undefined || v === ''
function Baris({ l, children }) {
  return (
    <div className="row" style={{ display: 'block', padding: '7px 0' }}>
      <div className="m" style={{ fontSize: 12 }}>{l}</div>
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{kosong(children) ? <span className="m">-</span> : children}</div>
    </div>
  )
}

// Detail aset (lihat saja), urutan dan isi mengikuti form pengajuan. Tombol Edit membuka form edit.
export default function DetailAset({ a, tugas = [], tutup, edit }) {
  const wa = waLink(a.no_hp, `Assalamu'alaikum ${a.pic || ''}, kami dari Program Pangan Sekolah Relawan. Kami ingin berkoordinasi terkait ${a.nama}.`)
  const adaTitik = a.latitude != null && a.longitude != null
  const peta = adaTitik ? openUrl({ lat: a.latitude, lng: a.longitude })
    : /^https?:/.test(a.lokasi_maps || '') ? a.lokasi_maps : openUrl({ q: `${a.nama} ${a.kota || ''}` })
  const foto = a.foto_urls || []
  const h = { margin: '18px 0 2px' }

  return (
    <div className="modal" onClick={tutup}><div onClick={(e) => e.stopPropagation()}>
      <h2 style={{ marginBottom: 4 }}>{a.nama}</h2>
      <div className="f" style={{ marginTop: 0 }}>
        {a.program && <span className={`tag ${a.program}`}>{a.program}</span>}
        {a.dari_pengajuan && <span className="badge">dari pengajuan</span>}
        <span className="m">{a.status === 'perlu_update' ? 'Perlu update' : a.status === 'terbaru' ? 'Data terbaru' : ''}</span>
      </div>

      <h3 style={h}>Data pengaju</h3>
      <Baris l="Nama pengaju / PIC">{a.pic}</Baris>
      <Baris l="No. Telp / WhatsApp">{a.no_hp && (wa ? <a href={wa} target="_blank" rel="noopener noreferrer">{a.no_hp} · Chat WhatsApp</a> : a.no_hp)}</Baris>
      <Baris l="Nama organisasi">{a.organisasi}</Baris>
      <Baris l="Alamat pengaju">{a.alamat_pengaju}</Baris>

      <h3 style={h}>Data pondok / panti</h3>
      <Baris l="Program">{a.program}</Baris>
      <Baris l="Jenis lembaga (cluster)">{a.cluster}</Baris>
      <Baris l="Kota / Kabupaten">{a.kota}</Baris>
      <Baris l="Alamat lengkap">{a.alamat}</Baris>
      <Baris l="Jumlah santri & pengurus (penerima manfaat)">{a.jumlah_pm}</Baris>
      <Baris l="Pimpinan pondok / panti">{a.pimpinan}</Baris>
      <Baris l="Konsumsi beras (kg / hari)">{a.kg_beras_per_hari}</Baris>
      <Baris l="Kategori santri / keterangan">{a.keterangan}</Baris>
      <Baris l="Kenapa harus dibantu? (story / biografi)">{a.story}</Baris>
      <Baris l="Keterangan tambahan / rekomendasi (mis. program Ramadhan)">{a.rekomendasi}</Baris>

      <h3 style={h}>Status &amp; dokumentasi</h3>
      <Baris l="Tahun perolehan aset">{a.tahun_aset}</Baris>
      <Baris l="Tahun pembaruan aset">{a.tahun_pembaruan}</Baris>
      <Baris l="Implementasi">{a.sudah_implementasi ? `✅ Sudah terimplementasi${a.implementasi_terakhir ? ` (terakhir ${a.implementasi_terakhir})` : ''}` : 'Belum terimplementasi'}</Baris>
      <Baris l="Link dokumentasi">{a.link_dokumentasi && <a href={a.link_dokumentasi} target="_blank" rel="noreferrer">📎 Buka link dokumentasi ↗</a>}</Baris>

      <h3 style={h}>Foto dokumentasi ({foto.length})</h3>
      {foto.length === 0 ? <div className="m">Belum ada foto.</div> : (
        <div className="thumbs">{foto.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt={`foto ${i + 1}`} loading="lazy" /></a>)}</div>
      )}

      <h3 style={h}>Data santri (privat, hanya PIC)</h3>
      {(a.dokumen_santri || []).length === 0 ? <div className="m">Tidak ada dokumen.</div> : <DokumenList dokumen={a.dokumen_santri} />}

      <h3 style={h}>Titik lokasi</h3>
      <div className="m">{adaTitik ? `${Number(a.latitude).toFixed(6)}, ${Number(a.longitude).toFixed(6)}${a.titik_perkiraan ? ' (titik perkiraan)' : ''}` : 'Belum ada titik lokasi'} · <a href={peta} target="_blank" rel="noreferrer">Buka di Google Maps ↗</a></div>
      <PetaEmbed lat={a.latitude} lng={a.longitude} q={`${a.nama || ''} ${a.kota || ''}`} />

      {tugas.length > 0 && (<>
        <h3 style={h}>To-do terkait aset ini</h3>
        {tugas.map((t) => <div className="row" key={t.id}>☑ {t.judul} <span className="m">- {STATUS_TUGAS[t.status]}{t.tenggat ? `, tenggat ${t.tenggat}` : ''}</span></div>)}
      </>)}

      <div className="f" style={{ marginTop: 18 }}>
        <button onClick={edit}>✏️ Edit aset</button>
        <button className="sec" onClick={tutup}>Tutup</button>
      </div>
      <div className="f">
        <TombolUnduh label="⬇ Profil (Word)" onRun={() => unduhDocx(profilAset(a))} />
        <TombolUnduh label="⬇ Paket ZIP (untuk Google Drive)" onRun={() => unduhPaket(profilAset(a))} />
      </div>
    </div></div>
  )
}
