'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  MoreHorizontal, 
  ArrowUpRight, 
  Copy, 
  Plus, 
  ArrowLeft, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  QrCode
} from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import QRCode from 'react-qr-code'
import { useToast } from '@/components/ui/use-toast'

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
  created_via?: 'api' | 'dashboard'
  success_url?: string
}

interface Transaction {
  id: string
  payment_link_id: string
  status: 'completed' | 'pending' | 'failed'
  amount: number
  customer_wallet: string
  created_at: string
  from_token?: string
  from_chain_id?: number
}

function LinksPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const linkId = searchParams.get('id')

  // List State
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [search, setSearch] = useState('')
  const [qrLink, setQrLink] = useState<PaymentLink | null>(null)

  // Detail State
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Fetch Links List
  useEffect(() => {
    if (!linkId) {
      fetchLinks()
    }
  }, [linkId])

  // Fetch Link Details if ID is present
  useEffect(() => {
    if (linkId) {
      fetchLinkDetails(linkId)
    } else {
      setSelectedLink(null)
    }
  }, [linkId])

  async function fetchLinks() {
    try {
      setLoadingLinks(true)
      const res = await fetch('/api/payment-links')
      if (res.ok) {
        const data = await res.json()
        setLinks(data)
      }
    } catch (error) {
      console.error('Failed to fetch links', error)
    } finally {
      setLoadingLinks(false)
    }
  }

  async function fetchLinkDetails(id: string) {
    try {
      setLoadingDetails(true)
      // Run in parallel for speed
      const [linkRes, txRes] = await Promise.all([
        fetch(`/api/payment-links/${id}`),
        fetch(`/api/v1/transactions?payment_link_id=${id}`)
      ])

      if (linkRes.ok) {
        const linkData = await linkRes.json()
        setSelectedLink(linkData)
      }

      if (txRes.ok) {
        const txData = await txRes.json()
        setTransactions(txData.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch details', error)
      toast({
        title: "Error",
        description: "Failed to load link details",
        variant: "destructive"
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const copyToClipboard = (text: string, label: string = "Link") => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`
    })
  }

  // --- RENDER DETAIL VIEW ---
  if (linkId) {
    if (loadingDetails) {
      return (
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (!selectedLink) {
      return (
        <div className="text-center py-12">
          <h2 className="text-xl font-bold">Link Not Found</h2>
          <Button variant="link" onClick={() => router.push('/dashboard/links')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      )
    }

    const payUrl = `${window.location.origin}/pay/${selectedLink.id}`

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/links')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{selectedLink.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={selectedLink.status === 'active' ? 'default' : 'secondary'} className="uppercase">
                  {selectedLink.status}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">
                  {selectedLink.amount ? `$${selectedLink.amount} ${selectedLink.currency}` : 'Flexible Amount'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => copyToClipboard(payUrl, "Payment Link")}>
              <Copy className="mr-2 h-4 w-4" /> Share Link
            </Button>
            <Link href={`/pay/${selectedLink.id}`} target="_blank">
               <Button variant="outline">
                 <ArrowUpRight className="mr-2 h-4 w-4" /> View Page
               </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-6">
            <Card>
               <CardHeader>
                <CardTitle className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No transactions yet.</p>
                    <p className="text-sm">Share the link to start accepting payments.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase font-mono text-muted-foreground bg-muted/50">
                        <tr>
                           <th className="px-4 py-3">Status / Date</th>
                           <th className="px-4 py-3">Amount</th>
                           <th className="px-4 py-3">Customer</th>
                           <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {transactions.map(tx => (
                          <tr key={tx.id} className="group hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {tx.status === 'completed' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                )}
                                <div>
                                  <div className="font-medium capitalize">{tx.status}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {new Date(tx.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium">
                              ${tx.amount?.toFixed(2)}
                              <span className="text-[10px] text-muted-foreground ml-1">
                                ({tx.from_token})
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                               {tx.customer_wallet.slice(0,6)}...{tx.customer_wallet.slice(-4)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link href={`/dashboard/transactions/${tx.id}`}>
                                <Button variant="ghost" size="sm" className="h-6 text-xs">
                                  Details
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
             <Card>
               <CardHeader>
                 <CardTitle className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Configuration</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <div className="text-muted-foreground mb-1">Created Via</div>
                     <Badge variant="outline" className="font-mono text-xs">
                       {selectedLink.created_via === 'api' ? 'API' : 'DASHBOARD'}
                     </Badge>
                   </div>
                   <div>
                     <div className="text-muted-foreground mb-1">Receive Mode</div>
                     <div className="font-medium capitalize">{selectedLink.receive_mode.replace('_', ' ')}</div>
                   </div>
                   <div>
                     <div className="text-muted-foreground mb-1">Success URL</div>
                     <div className="font-mono text-xs truncate" title={selectedLink.success_url || 'Default'}>
                       {selectedLink.success_url || '-'}
                     </div>
                   </div>
                   <div>
                      <div className="text-muted-foreground mb-1">Created At</div>
                      <div className="font-medium">{new Date(selectedLink.created_at).toLocaleString()}</div>
                   </div>
                 </div>
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // --- RENDER LIST VIEW ---
  const filteredLinks = links.filter(link =>
    link.title.toLowerCase().includes(search.toLowerCase()) ||
    link.id.includes(search)
  )

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter">PAYMENT_LINKS</h2>
          <p className="text-sm text-muted-foreground">Manage your active and archived payment links.</p>
        </div>
        <Link href="/dashboard/create">
          <Button className="bg-foreground text-background hover:bg-foreground/90 font-mono text-sm">
            <Plus className="mr-2 h-4 w-4" />  CREATE_LINK 
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
              <TableHead className="font-mono text-xs tracking-widest uppercase">Src</TableHead>
              <TableHead className="font-mono text-xs tracking-widest uppercase">Amount</TableHead>
              <TableHead className="font-mono text-xs tracking-widest uppercase">Mode</TableHead>
              <TableHead className="font-mono text-xs tracking-widest uppercase">Created</TableHead>
              <TableHead className="text-right font-mono text-xs tracking-widest uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingLinks ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredLinks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No links found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLinks.map((link) => (
                <TableRow 
                  key={link.id} 
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/dashboard/links?id=${link.id}`)}
                >
                  <TableCell className="font-bold">{link.title}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono border ${
                      link.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {link.status.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                      {link.created_via === 'api' ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono border border-blue-200 bg-blue-50 text-blue-700 rounded-sm">
                          API
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono border border-gray-200 bg-gray-50 text-gray-600 rounded-sm">
                          UI
                        </span>
                      )}
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
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="font-mono text-xs">Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/links?id=${link.id}`)}>
                           <ExternalLink className="mr-2 h-4 w-4" />
                           View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const url = `${window.location.origin}/pay/${link.id}`
                          navigator.clipboard.writeText(url)
                          toast({ title: "Copied!", description: "Link copied to clipboard." })
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </DropdownMenuItem>
                        <Link href={`/pay/${link.id}`} target="_blank" className="w-full">
                          <DropdownMenuItem>
                            <ArrowUpRight className="mr-2 h-4 w-4" />
                            Open Pay Page
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
             <Button variant="outline" size="sm" onClick={() => {
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${qrLink?.id}`
                navigator.clipboard.writeText(url)
                toast({ title: "Copied!", description: "Link copied to clipboard." })
             }}>
               <Copy className="mr-2 h-4 w-4" /> Copy Link
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LinksPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <LinksPageContent />
    </Suspense>
  )
}
