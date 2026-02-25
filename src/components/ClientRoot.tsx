'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

// Load entire provider tree + layout shell with SSR disabled.
const Providers = dynamic(
  () => import('@/providers').then((mod) => mod.Providers),
  { ssr: false }
)
const LayoutShell = dynamic(
  () => import('@/components/LayoutShell').then((mod) => mod.LayoutShell),
  { ssr: false }
)

export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <LayoutShell>
        {children}
      </LayoutShell>
    </Providers>
  )
}
