'use client'

import { Providers } from '@/providers'
import { LayoutShell } from '@/components/LayoutShell'
import type { ReactNode } from 'react'

/**
 * Client-side root wrapper.
 * Reown AppKit + wagmi handle SSR natively — no mount guard needed.
 */
export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <LayoutShell>
        {children}
      </LayoutShell>
    </Providers>
  )
}
