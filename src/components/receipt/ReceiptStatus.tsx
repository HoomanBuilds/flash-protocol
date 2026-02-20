'use client'

import { useState, useEffect } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { Loader2, CheckCircle, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoicePDF } from '@/components/invoice/InvoicePDF'
import { CHAINS } from '@/lib/chains'
import { motion, AnimatePresence } from 'framer-motion'
import { PremiumCard } from '@/components/ui/premium-card'

interface ReceiptStatusProps {
  transactionId: string
  initialData?: any
}

export function ReceiptStatus({ transactionId, initialData }: ReceiptStatusProps) {
  const [data, setData] = useState<any>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState('')
  const [isPolling, setIsPolling] = useState(true)

  const fetchReceipt = async () => {
    try {
      const res = await fetch(`/api/transactions/${transactionId}/receipt`)
      if (!res.ok) throw new Error('Failed to fetch receipt')
      const newData = await res.json()
      setData(newData)
      
      // Stop polling if completed or failed
      if (['completed', 'failed'].includes(newData.status)) {
        setIsPolling(false)
      }
    } catch (err) {
      console.error(err)
      setError('Could not update status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialData) fetchReceipt()

    let interval: NodeJS.Timeout
    if (isPolling) {
      interval = setInterval(fetchReceipt, 5000)
    }
    return () => clearInterval(interval)
  }, [transactionId, isPolling])

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      <span className="text-sm font-mono text-muted-foreground animate-pulse">RETRIEVING_RECEIPT_DATA...</span>
    </div>
  )

  if (error || !data) return (
    <div className="p-6 border border-destructive/20 bg-destructive/10 rounded-lg text-center">
      <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
      <h3 className="font-mono font-bold text-destructive">ERROR_FETCHING_RECEIPT</h3>
      <p className="text-xs text-muted-foreground mt-2">{error}</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4">
        RETRY
      </Button>
    </div>
  )

  const isCompleted = data.status === 'completed'
  const isFailed = data.status === 'failed'
  const chain = CHAINS.find(c => c.chainId === data.from_chain_id)
  const explorerUrl = chain?.explorerUrl 
    ? `${chain.explorerUrl}/tx/${data.tx_hash}`
    : '#'

  return (

    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      {/* Status Card */}
      <PremiumCard className="p-8">
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-4"
            >
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-white/20">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-mono tracking-tight text-white">PAYMENT_CONFIRMED</h2>
                <p className="text-zinc-400 text-sm font-mono mt-1">Transaction settled successfully on chain.</p>
              </div>
            </motion.div>
          ) : isFailed ? (
            <motion.div 
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-white/20">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold font-mono text-white">PAYMENT_FAILED</h2>
              <p className="text-zinc-400 text-sm font-mono">{data.error_message || 'Transaction could not be completed.'}</p>
            </motion.div>
          ) : (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-6"
            >
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-white rounded-full animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-mono animate-pulse text-white">PROCESSING_PAYMENT...</h2>
                <p className="text-xs text-zinc-500 font-mono mt-2 max-w-xs mx-auto">
                  Verifying transaction on blockchain. Do not close this tab.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invoice Download Action */}
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col items-center">
            <PDFDownloadLink
              document={<InvoicePDF transaction={data} merchant={data.payment_links?.merchants} paymentLink={data.payment_links} />}
              fileName={`invoice_${data.id.slice(0,8)}.pdf`}
              className="w-full"
            >
              {/* @ts-ignore */}
              {({ blob, url, loading: pdfLoading, error: pdfError }) => (
                <Button 
                    className="w-full h-12 text-base font-mono font-bold uppercase tracking-widest gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50"
                    disabled={pdfLoading}
                >
                    {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {pdfLoading ? 'GENERATING_PDF...' : '[ DOWNLOAD_OFFICIAL_RECEIPT ]'}
                </Button>
              )}
            </PDFDownloadLink>
            
            {/* Additional Actions */}
            <div className="flex gap-4 mt-6 text-xs font-mono text-zinc-500">
                <a 
                    href={explorerUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-1 hover:text-white transition-colors border-b border-transparent hover:border-white"
                >
                    <ExternalLink className="w-3 h-3" />
                    VIEW_ON_EXPLORER
                </a>
                <span className="text-zinc-700">|</span>
                <span className="flex items-center gap-1">
                    ID: {data.id.slice(0, 8)}
                </span>
            </div>
        </div>
      </PremiumCard>
      
      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
         <div className="bg-black/40 p-4 border border-white/10 rounded-lg backdrop-blur-sm">
            <span className="text-zinc-500 block mb-1">AMOUNT_PAID</span>
            <span className="text-lg font-bold block text-white">{data.from_amount} {data.from_token_symbol}</span>
         </div>
         <div className="bg-black/40 p-4 border border-white/10 rounded-lg backdrop-blur-sm">
            <span className="text-zinc-500 block mb-1">MERCHANT</span>
            <span className="text-lg font-bold block truncate text-white">{data.payment_links?.merchants?.business_name || 'Unknown'}</span>
         </div>
      </div>

    </div>
  )
}
