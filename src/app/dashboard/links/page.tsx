'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal, ArrowUpRight, Copy, Plus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import QRCode from 'react-qr-code'
import { QrCode } from 'lucide-react'

interface PaymentLink {
  id: string
  title: string
  description?: string
  amount?: number
  currency: string
  status: string
  slug: string
  created_at: string
  uses: number
  max_uses?: number
  receive_mode: string
  receive_token_symbol?: string
}

export default function LinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [qrLink, setQrLink] = useState<any>(null)

  useEffect(() => {
    async function fetchLinks() {
      try {
        const res = await fetch('/api/payment-links')
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

  const filteredLinks = links.filter(link =>
    link.title.toLowerCase().includes(search.toLowerCase()) ||
    link.id.includes(search)
  )

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/pay/${id}`
    navigator.clipboard.writeText(url)
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter">PAYMENT_LINKS</h2>
          <p className="text-sm text-muted-foreground">Manage your active and archived payment links.</p>
        </div>
        <Link href="/dashboard/create">
          <Button className="bg-foreground text-background hover:bg-foreground/90 font-mono text-sm">
            <Plus className="mr-2 h-4 w-4" /> [ CREATE_LINK ]
          </Button>
        </Link>
      </div>

      <div className="flex items-center py-4">
        <Input
          placeholder="Filter links..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm border-border font-mono"
        />
      </div>

      <div className="border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/50">
              <TableHead className="font-mono text-xs tracking-widest uppercase">Title</TableHead>
              <TableHead className="font-mono text-xs tracking-widest uppercase">Status</TableHead>
              <TableHead className="font-mono text-xs tracking-widest uppercase">Amount</TableHead>
              <TableHead className="font-mono text-xs tracking-widest uppercase">Mode</TableHead>
              <TableHead className="font-mono text-xs tracking-widest uppercase">Created</TableHead>
              <TableHead className="text-right font-mono text-xs tracking-widest uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredLinks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No links found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLinks.map((link) => (
                <TableRow key={link.id} className="hover:bg-muted/30">
                  <TableCell className="font-bold">{link.title}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono border ${
                      link.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {link.status.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">
                    {link.amount ? `$${link.amount} ${link.currency}` : 'Flexible'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {link.receive_mode === 'same_chain' ? 'Universal' : 'Bridge'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(link.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="font-mono text-xs">Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => copyToClipboard(link.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </DropdownMenuItem>
                        <Link href={`/pay/${link.id}`} target="_blank" className="w-full">
                          <DropdownMenuItem>
                            <ArrowUpRight className="mr-2 h-4 w-4" />
                            View Page
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem onClick={() => setQrLink(link)}>
                          <QrCode className="mr-2 h-4 w-4" />
                          Show QR Code
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!qrLink} onOpenChange={(open) => !open && setQrLink(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">[ QR_CODE ]</DialogTitle>
            <DialogDescription>
              Scan to pay {qrLink?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-6 bg-white border border-border">
            {qrLink && (
              <div style={{ height: "auto", margin: "0 auto", maxWidth: 200, width: "100%" }}>
                <QRCode
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${qrLink.id}`}
                  viewBox={`0 0 256 256`}
                />
              </div>
            )}
          </div>
          <div className="flex justify-center pb-4">
            <p className="text-xs text-muted-foreground break-all text-center px-4 font-mono">
              {`${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${qrLink?.id}`}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
