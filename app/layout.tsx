import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CELLery',
  description: 'A spreadsheet app with AI capabilities',
  icons: {
    icon: '/favicon.svg'
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
