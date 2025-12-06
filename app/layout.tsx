import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { I18nProvider } from '@/lib/i18n-context'
import { Providers } from '@/components/providers/session-provider'
import 'katex/dist/katex.min.css'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Math Learning Platform',
  description: 'Intelligent Math Learning Platform - Provides AI tutoring, interactive learning, and knowledge point management',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <I18nProvider>
              {children}
            </I18nProvider>
          </Providers>
        </ThemeProvider>
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
