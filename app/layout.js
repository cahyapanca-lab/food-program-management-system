import './globals.css'

export const metadata = {
  title: 'Program Pangan - Sekolah Relawan',
  description: 'Pendataan aset BUYD dan FFC',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
