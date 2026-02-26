'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppKitAccount } from '@reown/appkit/react'
import { 
  Loader2, 
  ArrowUpRight, 
  Search, 
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'

interface Transaction {
  id: string
  payment_link_id: string
  status: 'completed' | 'pending' | 'failed'
  amount: number
  currency?: string
  customer_wallet: string
  tx_hash?: string
  created_at: string
  from_chain_id?: number
  to_chain_id?: number
  from_token?: string
  to_token?: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { address } = useAppKitAccount()

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    try {
      setLoading(true)
      const headers: Record<string, string> = address ? { 'x-wallet-address': address } : {}
      const res = await fetch('/api/transactions?limit=50', { headers })
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.customer_wallet?.toLowerCase().includes(search.toLowerCase()) ||
      tx.tx_hash?.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tighter">TRANSACTIONS</h2>
        <p className="text-sm text-muted-foreground">Monitor and manage all incoming payments.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by wallet, hash, or ID..." 
            className="pl-9 font-mono text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Filter Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border bg-background rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase font-mono text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Status / Date</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Link ID</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {tx.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : tx.status === 'pending' ? (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium capitalize">{tx.status}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold tracking-tight">
                        ${tx.amount?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {tx.from_token || 'USDC'} ({tx.from_chain_id})
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <div className="flex items-center gap-1" title={tx.customer_wallet}>
                        {tx.customer_wallet.slice(0, 6)}...{tx.customer_wallet.slice(-4)}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      #{tx.payment_link_id?.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/pay/${tx.payment_link_id}?txId=${tx.id}`} target="_blank">
                          <Button variant="outline" size="sm" className="font-mono text-xs h-8">
                             RECEIPT
                          </Button>
                        </Link>
                        <Link href={`/dashboard/transactions/${tx.id}`}>
                          <Button variant="ghost" size="sm" className="font-mono text-xs h-8">
                            DETAILS <ArrowUpRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
