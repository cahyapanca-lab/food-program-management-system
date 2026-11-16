import { buatIcs } from '@/lib/kalender'

// Umpan kalender publik (.ics). Bisa "dilanggan" dari Google Calendar / Apple Calendar,
// sehingga jadwal dan pengingat otomatis muncul di HP. Hanya memuat jadwal yang ditandai publik.
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const dari = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  let data = []
  try {
    const headers = { apikey: key }
    if (!String(key).startsWith('sb_')) headers.Authorization = `Bearer ${key}`
    const r = await fetch(
      `${url}/rest/v1/jadwal_aksi?select=id,tanggal,program,kota,lokasi,jumlah_bantuan,satuan,jumlah_pm,segmentasi&publik=eq.true&tanggal=gte.${dari}&order=tanggal`,
      { headers, cache: 'no-store' })
    if (r.ok) data = await r.json()
  } catch { /* tetap kirim kalender kosong */ }
  return new Response(buatIcs(data), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="jadwal-aksi-pangan.ics"',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
