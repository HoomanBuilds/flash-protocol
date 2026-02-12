'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPayPage = pathname.startsWith('/pay')

  return (
    <>
      {!isPayPage && <Navbar />}
      <main className="min-h-screen flex flex-col">
        {children}
      </main>
      {!isPayPage && <Footer />}
    </>
  )
}
