'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft, Shield } from 'lucide-react'

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
import { useAppKitAccount } from '@reown/appkit/react'
import { useWalletClient } from 'wagmi'
import { generateStealthKeys } from '@/lib/stealth'

export default function CreateLinkPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dynamicChains, setDynamicChains] = useState<UnifiedChain[]>([])
  const [chainsLoading, setChainsLoading] = useState(true)
  const { address } = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const [stealthKeysReady, setStealthKeysReady] = useState(false)
  const [usePrivacy, setUsePrivacy] = useState(false)
  const [privacySetupLoading, setPrivacySetupLoading] = useState(false)
  const [privacyError, setPrivacyError] = useState('')

  // Look up native token symbol from dynamic chain data
  const getNativeSymbol = (chainId: string) => {
    const chain = dynamicChains.find(c => c.key === chainId)
    return chain?.symbol || 'ETH'
  }

  // Check if merchant already has stealth keys set up (silent check)
  useEffect(() => {
    async function checkStealth() {
      if (!address) return
      try {
        const res = await fetch('/api/profile/stealth', {
          headers: { 'x-wallet-address': address },
        })
        const data = await res.json()
        if (res.ok && data.stealth_enabled && data.has_keys) {
          setStealthKeysReady(true)
        }
      } catch (err) {
        console.error('Stealth check failed:', err)
      }
    }
    checkStealth()
  }, [address])

  // Fetch chains — all EVM chains for privacy mode, USDC-only for normal
  useEffect(() => {
    async function loadChains() {
      setChainsLoading(true)
      try {
        const url = usePrivacy ? '/api/chains' : '/api/chains?hasUSDC=true'
        const res = await fetch(url)
        const data = await res.json()
        if (data.success && data.chains && data.chains.length > 0) {
          let chains = data.chains
          // Stealth addresses only work on EVM chains
          if (usePrivacy) {
            chains = chains.filter((c: UnifiedChain) => c.type === 'evm')
          }
          const sorted = chains.sort((a: UnifiedChain, b: UnifiedChain) => a.name.localeCompare(b.name))
          setDynamicChains(sorted)
        } else if (!usePrivacy) {
          // Fallback for non-stealth
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
  }, [usePrivacy])

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

  // Handle privacy toggle 
  const handlePrivacyToggle = useCallback(async (checked: boolean) => {
    if (!checked) {
      setUsePrivacy(false)
      setPrivacyError('')
      return
    }

    if (stealthKeysReady) {
      setUsePrivacy(true)
      form.setValue('receive_mode', 'specific_chain')
      return
    }

    if (!walletClient || !address) {
      setPrivacyError('Connect your wallet first')
      return
    }

    setPrivacySetupLoading(true)
    setPrivacyError('')

    try {
      // 1. Generate stealth keys (triggers wallet signature popup)
      const { viewingKeyNodeSerialized, stealthMetaAddress } =
        await generateStealthKeys(walletClient)

      // 2. Store keys on backend
      const res = await fetch('/api/profile/stealth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          viewingKeyNode: viewingKeyNodeSerialized,
          stealthMetaAddress,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to set up privacy keys')
      }

      // 3. Keys are now ready 
      setStealthKeysReady(true)
      setUsePrivacy(true)
      form.setValue('receive_mode', 'specific_chain')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Setup failed'
      if (message.includes('rejected') || message.includes('denied')) {
        setPrivacyError('Wallet signature rejected')
      } else {
        setPrivacyError(message)
      }
    } finally {
      setPrivacySetupLoading(false)
    }
  }, [stealthKeysReady, walletClient, address, form])

  const watchedValues = form.watch()
  const receiveMode = watchedValues.receive_mode
  const selectedChainId = watchedValues.receive_chain_id?.toString() || ''
  const nativeSymbol = getNativeSymbol(selectedChainId)

  // When privacy + chain changes, auto-set native token
  useEffect(() => {
    if (!usePrivacy || !selectedChainId) return
    form.setValue('receive_token', '0x0000000000000000000000000000000000000000')
    form.setValue('receive_token_symbol', nativeSymbol)
    form.setValue('use_stealth', true)
  }, [usePrivacy, selectedChainId, nativeSymbol, form])

  // When privacy toggled off, clear stealth fields
  useEffect(() => {
    if (!usePrivacy) {
      form.setValue('use_stealth', false)
      form.setValue('receive_token', undefined)
      form.setValue('receive_token_symbol', undefined)
    }
  }, [usePrivacy, form])

  async function onSubmit(data: CreatePaymentLinkInput) {
    setLoading(true)
    try {
      const res = await fetch('/api/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(address ? { 'x-wallet-address': address } : {}),
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
              <h3 className="text-sm font-bold tracking-widest uppercase">CONFIGURATION</h3>
              <p className="text-xs text-muted-foreground mt-1">Customize your payment link settings.</p>
            </div>

            <div className="p-4 bg-muted/50 border border-border">
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-bold">Privacy Payment</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receive at a stealth address — unlinkable, single-use, native tokens only
                  </p>
                </div>
                <Switch
                  checked={usePrivacy}
                  onCheckedChange={handlePrivacyToggle}
                  disabled={privacySetupLoading}
                />
              </div>
              {privacySetupLoading && (
                <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs font-mono">SIGN_WALLET_MESSAGE — one-time setup...</span>
                </div>
              )}
              {privacyError && (
                <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono">
                  {privacyError}
                </div>
              )}
            </div>

            {usePrivacy && (
              <div className="p-4 border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-500 text-sm">🔒</span>
                  <span className="text-xs font-bold font-mono text-green-500 tracking-widest uppercase">PRIVACY_MODE_ACTIVE</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Settlement locked to native chain token ({nativeSymbol}). Each payment generates a fresh stealth address.
                </p>
              </div>
            )}

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
                      <FormLabel className="text-xs tracking-widest uppercase text-muted-foreground">
                        Amount (USD)
                      </FormLabel>
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                          USD
                        </span>
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
                            disabled={usePrivacy}
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
                              { id: '42161', name: 'Arbitrum', icon: '', evm: true },
                              { id: '8453', name: 'Base', icon: '', evm: true },
                              { id: '137', name: 'Polygon', icon: '', evm: true },
                              { id: '10', name: 'Optimism', icon: '', evm: true },
                              { id: '1', name: 'Ethereum', icon: '', evm: true },
                              { id: 'solana', name: 'Solana', icon: '', evm: false },
                            ]
                            .filter((chain) => !usePrivacy || chain.evm)
                            .map((chain) => (
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
                          onValueChange={(val) => field.onChange(val)}
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
                                <SelectItem key={chain.key} value={chain.key}>
                                  {chain.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          {usePrivacy
                            ? `${nativeSymbol} on this chain is where stealth payments will settle.`
                            : 'USDC on this chain is where you\'ll receive funds.'
                          }
                        </FormDescription>
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
