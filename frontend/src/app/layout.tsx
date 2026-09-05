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

import { ThemeProvider } from "@/components/ThemeProvider"

import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        
        {/* Google Translate Integration */}
        <div id="google_translate_element" style={{ display: 'none' }}></div>
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
            function googleTranslateElementInit() {
              new window.google.translate.TranslateElement({
                pageLanguage: 'en',
                autoDisplay: false
              }, 'google_translate_element');
            }
          `}
        </Script>
        <Script 
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" 
          strategy="afterInteractive" 
        />
      </body>
    </html>
  )
}
