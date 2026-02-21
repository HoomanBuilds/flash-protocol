'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft } from 'lucide-react'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { LinkPreview } from '@/components/dashboard/LinkPreview'
import { createPaymentLinkSchema, type CreatePaymentLinkInput } from '@/lib/validations/payment-link'
import type { UnifiedChain } from '@/lib/chain-registry'

export default function CreateLinkPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dynamicChains, setDynamicChains] = useState<UnifiedChain[]>([])
  const [chainsLoading, setChainsLoading] = useState(true)

  // Fetch only chains that have USDC available
  useEffect(() => {
    async function loadChains() {
      setChainsLoading(true)
      try {
        // Only fetch chains that have USDC 
        const res = await fetch('/api/chains?hasUSDC=true')
        const data = await res.json()
        if (data.success && data.chains && data.chains.length > 0) {
          const sorted = data.chains.sort((a: UnifiedChain, b: UnifiedChain) => a.name.localeCompare(b.name))
          setDynamicChains(sorted)
        } else {
          // Fallback
          const fallbackRes = await fetch('/api/chains')
          const fallbackData = await fallbackRes.json()
          if (fallbackData.success && fallbackData.chains) {
            const sorted = fallbackData.chains.sort((a: UnifiedChain, b: UnifiedChain) => a.name.localeCompare(b.name))
            setDynamicChains(sorted)
          }
        }
      } catch (err) {
        console.error('Failed to load chains:', err)
      } finally {
        setChainsLoading(false)
      }
    }
    loadChains()
  }, [])

  const form = useForm<CreatePaymentLinkInput>({
    resolver: zodResolver(createPaymentLinkSchema),
    defaultValues: {
      title: '',
      currency: 'USD',
      receive_mode: 'specific_chain',
      config: {
        theme: 'light',
      },
      recipient_address: '',
      receive_chain_id: undefined,
    },
  })

  const watchedValues = form.watch()
  const receiveMode = watchedValues.receive_mode

  async function onSubmit(data: CreatePaymentLinkInput) {
    setLoading(true)
    try {
      const res = await fetch('/api/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create link')
      }

      router.push('/dashboard')
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center mb-4 group">
          <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> ./dashboard
        </Link>
        <h2 className="text-2xl font-bold tracking-tighter">CREATE_PAYMENT_LINK</h2>
        <p className="text-sm text-muted-foreground mt-1">Generate a new payment flow.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <div className="border border-border bg-background p-6">
            <div className="mb-6 pb-6 border-b border-border">
              <h3 className="text-sm font-bold tracking-widest uppercase">[ CONFIGURATION ]</h3>
              <p className="text-xs text-muted-foreground mt-1">Customize your payment link settings.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground">Link Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Lifetime Membership" {...field} className="border-border focus:border-foreground/50 transition-all font-bold text-lg placeholder:text-muted-foreground/40" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground">Amount (USDC)</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.valueAsNumber || undefined)}
                            className="border-border font-mono pr-16"
                          />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">USDC</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipient_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground">Recipient Wallet</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} className="border-border font-mono text-xs" />
                      </FormControl>
                      <FormDescription className="text-xs">Funds are settled to this address.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="p-4 bg-muted/50 border border-border">
                  <FormField
                    control={form.control}
                    name="receive_mode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold">Cross-Chain Mode</FormLabel>
                          <FormDescription className="text-xs">
                            Accept payments from any chain
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === 'same_chain'}
                            onCheckedChange={(checked) =>
                              field.onChange(checked ? 'same_chain' : 'specific_chain')
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {receiveMode === 'specific_chain' && (
                  <FormField
                    control={form.control}
                    name="receive_chain_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground">Destination Chain</FormLabel>

                        {/* Popular chain quick-select tabs */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Popular chains</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 42161, name: 'Arbitrum', icon: '' },
                              { id: 8453, name: 'Base', icon: '' },
                              { id: 137, name: 'Polygon', icon: '' },
                              { id: 10, name: 'Optimism', icon: '' },
                              { id: 1, name: 'Ethereum', icon: '' },
                            ].map((chain) => (
                              <button
                                key={chain.id}
                                type="button"
                                onClick={() => field.onChange(chain.id)}
                                className={`
                                  px-3 py-1.5 text-xs font-mono border transition-all
                                  ${field.value === chain.id
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'bg-background text-foreground border-border hover:border-foreground/50'
                                  }
                                `}
                              >
                                {chain.icon} {chain.name}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-yellow-500">
                            We recommend Arbitrum for lowest fees, near-instant settlement, and greater route compatibility.
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">or select from all</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* Full dropdown */}
                        <Select
                          onValueChange={(val) => field.onChange(parseInt(val))}
                          value={field.value?.toString() || ''}
                        >
                          <FormControl>
                            <SelectTrigger className="border-border">
                              <SelectValue placeholder="Browse all chains..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                            {chainsLoading ? (
                              <SelectItem value="loading" disabled>Loading chains...</SelectItem>
                            ) : dynamicChains.length === 0 ? (
                              <SelectItem value="none" disabled>No chains available</SelectItem>
                            ) : (
                              dynamicChains.map(chain => (
                                <SelectItem key={chain.key} value={chain.chainId?.toString() || chain.key}>
                                  {chain.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">USDC on this chain is where you'll receive funds.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" className="w-full h-12 text-lg bg-foreground text-background hover:bg-foreground/90 font-mono" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                   CREATE_LINK 
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div className="hidden lg:block sticky top-36 h-[600px]">
          <LinkPreview
            title={watchedValues.title}
            amount={watchedValues.amount}
            currency="USD"
          />
        </div>
      </div>
    </div>
  )
}
