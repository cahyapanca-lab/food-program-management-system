import { embedUrl } from '@/lib/maps'

// pratinjau satu lokasi (tanpa API key). Memakai titik jika ada, jika tidak mencari berdasarkan nama.
export default function PetaEmbed({ lat, lng, q }) {
  const adaTitik = lat !== null && lat !== undefined && lat !== '' && lng !== null && lng !== undefined && lng !== ''
  if (!adaTitik && !(q || '').trim()) return null
  return (
    <iframe className="map" title="Peta lokasi" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
      src={embedUrl({ lat, lng, q })} />
  )
}
