'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Providers } from '@/providers'
import { LayoutShell } from '@/components/LayoutShell'

/**
 * ClientRoot guards the entire provider + layout tree behind a client-side mount check.
 * 
 */
export function ClientRoot({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Providers>
      <LayoutShell>
        {children}
      </LayoutShell>
    </Providers>
  )
}
