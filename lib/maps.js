export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''

const has = (v) => v !== null && v !== undefined && v !== ''

// URL untuk iframe pratinjau (tanpa API key)
export function embedUrl({ lat, lng, q }) {
  const query = has(lat) && has(lng) ? `${lat},${lng}` : encodeURIComponent(q || '')
  return `https://maps.google.com/maps?q=${query}&z=15&output=embed`
}

// Link untuk membuka Google Maps (aplikasi / web)
export function openUrl({ lat, lng, q }) {
  const query = has(lat) && has(lng) ? `${lat},${lng}` : q || ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

// Ambil koordinat dari link Google Maps panjang (link pendek maps.app.goo.gl tidak bisa dibaca)
export function parseCoords(url) {
  if (!url) return null
  const pats = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  ]
  for (const p of pats) {
    const m = String(url).match(p)
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
  }
  return null
}

let loading = null
export function loadGoogleMaps() {
  if (typeof window === 'undefined' || !MAPS_KEY) return Promise.reject(new Error('API key Google Maps belum diisi'))
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    window.__gmInit = () => resolve(window.google.maps)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=__gmInit&v=weekly`
    s.async = true
    s.onerror = () => { loading = null; reject(new Error('Gagal memuat Google Maps')) }
    document.head.appendChild(s)
  })
  return loading
}
