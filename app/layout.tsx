import type { Metadata } from 'next'
import './globals.css'
import { headers, cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { AuthProvider } from '@/components/auth/auth-provider'
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: 'ADCI CRM',
  description: 'Institute CRM System',
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
      <body>
        <AuthProvider initialSession={session}>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
