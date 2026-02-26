'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, CreditCard, Activity, ArrowUpRight, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppKitAccount } from '@reown/appkit/react'

interface PaymentLink {
  id: string
  title: string
  status: 'active' | 'inactive' | 'archived'
  amount?: number
  currency: string
  total_revenue?: number
  current_uses?: number
  receive_mode: string
}

export default function DashboardOverview() {
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(true)
  const { address } = useAppKitAccount()

  useEffect(() => {
    async function fetchLinks() {
      try {
        const headers: Record<string, string> = address ? { 'x-wallet-address': address } : {}
        const res = await fetch('/api/payment-links', { headers })
        if (res.ok) {
          const data = await res.json()
          setLinks(data)
        }
      } catch (error) {
        console.error('Failed to fetch links', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLinks()
  }, [])

  const activeLinks = links.filter(l => l.status === 'active').length
  const totalRevenue = links.reduce((sum, link) => sum + (link.total_revenue || 0), 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter">OVERVIEW</h2>
          <p className="text-sm text-muted-foreground">Manage your payment links and track revenue.</p>
        </div>
        <Link href="/dashboard/create">
          <Button className="bg-foreground text-background hover:bg-foreground/90 font-mono text-sm">
            <Plus className="mr-2 h-4 w-4" />  CREATE_LINK 
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="border border-border bg-background p-6 hover:border-foreground/30 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Total Revenue</h3>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold tracking-tight">${totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">All settlement chains</p>
        </div>

        <div className="border border-border bg-background p-6 hover:border-foreground/30 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Active Links</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold tracking-tight">{activeLinks}</div>
          <p className="text-xs text-muted-foreground mt-1">{links.length} total generated</p>
        </div>
      </div>

      {/* Recent Links */}
      <div className="space-y-6">
        <h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground"> RECENT_ACTIVITY </h3>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted/50 animate-pulse border border-border" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border bg-background">
            <div className="p-4 bg-muted mb-4">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold">NO_LINKS_FOUND</h3>
            <p className="text-muted-foreground mb-4 max-w-sm text-sm">
              Get started by creating your first payment link.
            </p>
            <Link href="/dashboard/create">
              <Button variant="outline" className="font-mono"> CREATE_LINK </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => (
              <Link href={`/dashboard/links?id=${link.id}`} key={link.id} className="block group">
                <div className="h-full border border-border bg-background hover:border-foreground/30 hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1 overflow-hidden">
                  <div className="p-6 pb-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-bold truncate pr-4 group-hover:underline decoration-2 underline-offset-4">{link.title}</h4>
                      <span className={`px-2 py-0.5 text-xs font-mono border ${
                        link.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {link.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="text-2xl font-bold mb-1 tracking-tight">
                      {link.amount ? `$${link.amount} ${link.currency}` : 'Flexible Amount'}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-foreground" />
                      {link.receive_mode === 'same_chain' ? 'Universal' : 'Bridge Only'}
                    </p>

                    <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Activity className="w-3 h-3 mr-1" /> {link.current_uses || 0} uses
                      </span>
                      <span className="text-xs font-bold flex items-center group-hover:translate-x-1 transition-transform">
                        DETAILS <ArrowUpRight className="w-3 h-3 ml-1" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
