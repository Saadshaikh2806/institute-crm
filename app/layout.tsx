import type { Metadata, Viewport } from 'next'
import './globals.css'
import { headers, cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { AuthProvider } from '@/components/auth/auth-provider'
import { Toaster } from "sonner"

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f46e5',
}

export const metadata: Metadata = {
  title: 'ADCI CRM',
  description: 'Institute CRM System',
  manifest: '/manifest.json',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#303030" />
        <link rel="icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" sizes="512x512" href="/icons/icon-512x512.png" />
      </head>
      <body>
        <AuthProvider initialSession={session}>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
