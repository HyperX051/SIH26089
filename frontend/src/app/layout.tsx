import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cooperative Gig Services Platform',
  description: 'Smart India Hackathon (PSID: 26089)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
