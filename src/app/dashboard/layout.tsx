'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Link as LinkIcon,
  PlusCircle,
  Terminal,
  Settings,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  const navigation = [
    { name: 'overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'transactions', href: '/dashboard/transactions', icon: Activity },
    { name: 'create', href: '/dashboard/create', icon: PlusCircle },
    { name: 'links', href: '/dashboard/links', icon: LinkIcon },
    { name: 'settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background font-mono">
      {/* Top Navigation Bar */}
      <div className="border-b border-border bg-background sticky top-[57px] z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-sm font-bold tracking-widest uppercase text-muted-foreground"> DASHBOARD </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">CONNECTED</span>
            </div>
          </div>
          <nav className="flex gap-0 -mb-px">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
