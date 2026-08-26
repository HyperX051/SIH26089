import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FixNow - Cooperative Gig Services Platform',
  description: 'Book verified plumbers, electricians, and professionals instantly. A transparent, cooperative gig economy platform empowering workers and ensuring quality for customers.',
  keywords: 'plumber near me, electrician, home maintenance, gig economy, cooperative, SIH 26089, verified workers, home repair',
  openGraph: {
    title: 'FixNow - Cooperative Gig Services',
    description: 'Instant, verified, and transparent local home services.',
    type: 'website',
  },
  robots: 'index, follow',
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
