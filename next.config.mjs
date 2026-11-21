export default {
  reactStrictMode: true,
  // alamat lama /admin dialihkan ke /pic (agar bookmark lama tetap jalan)
  async redirects() {
    return [
      { source: '/admin', destination: '/pic', permanent: false },
      { source: '/admin/:path*', destination: '/pic/:path*', permanent: false },
    ]
  },
}
