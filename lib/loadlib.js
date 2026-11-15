// Pustaka ekspor dimuat dari CDN saat dibutuhkan (versi dikunci), jadi tidak menambah paket npm.
const URLS = {
  xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  docx: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
  jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  pptx: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
}
const GLOBAL = { xlsx: 'XLSX', docx: 'docx', jszip: 'JSZip', pptx: 'PptxGenJS' }
const cache = {}

export function loadLib(name) {
  if (typeof window === 'undefined') return Promise.reject(new Error('hanya berjalan di browser'))
  if (window[GLOBAL[name]]) return Promise.resolve(window[GLOBAL[name]])
  if (cache[name]) return cache[name]
  cache[name] = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = URLS[name]
    s.async = true
    s.onload = () => (window[GLOBAL[name]] ? resolve(window[GLOBAL[name]]) : reject(new Error(`Pustaka ${name} tidak termuat`)))
    s.onerror = () => { delete cache[name]; reject(new Error(`Gagal memuat pustaka ${name}. Periksa koneksi internet.`)) }
    document.head.appendChild(s)
  })
  return cache[name]
}
