'use client'

import { Zap, Globe2, ShieldCheck, Percent, Wallet, Layers, ArrowRight, Terminal, Activity, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { FlickeringGrid } from '@/components/ui/flickering-grid'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'

const SUPPORTED_CHAINS = [
  { name: 'Ethereum', id: '1', status: 'active' },
  { name: 'Arbitrum', id: '42161', status: 'active' },
  { name: 'Optimism', id: '10', status: 'active' },
  { name: 'Base', id: '8453', status: 'active' },
  { name: 'Polygon', id: '137', status: 'active' },
  { name: 'Avalanche', id: '43114', status: 'active' },
  { name: 'BSC', id: '56', status: 'active' },
  { name: 'zkSync', id: '324', status: 'active' },
  { name: 'Scroll', id: '534352', status: 'active' },
  { name: 'Linea', id: '59144', status: 'active' },
]

const BENEFITS = [
  { title: 'Global Reach', stat: '70+', unit: 'Chains', desc: 'Accept payments from customers on any supported blockchain network.', icon: Globe2 },
  { title: 'Instant Settlement', stat: '<30', unit: 'Seconds', desc: 'Receive funds immediately. No T+2 delays, no waiting.', icon: Zap },
  { title: 'Lower Fees', stat: '80%', unit: 'Savings', desc: 'Drastically reduce processing costs versus traditional card rails.', icon: Percent },
  { title: 'Non-Custodial', stat: '0', unit: 'Trust Required', desc: 'Funds go directly to your wallet. We never hold your money.', icon: ShieldCheck },
  { title: 'Stable Settlement', stat: 'USDC', unit: 'Default', desc: 'Never worry about crypto volatility with stablecoin settlement.', icon: Wallet },
  { title: 'Auto-Bridge', stat: 'Any→Any', unit: 'Route', desc: 'We handle cross-chain bridging and swapping behind the scenes.', icon: Layers },
]

const PIPELINE_STEPS = [
  { num: '01', cmd: 'configure', title: 'Set Parameters', desc: 'Define amount, accepted tokens, and your settlement chain from the dashboard.' },
  { num: '02', cmd: 'generate', title: 'Create Payment Link', desc: 'Generate a unique URL. Share via email, embed in your site, or print a QR code.' },
  { num: '03', cmd: 'settle', title: 'Receive Funds', desc: 'Payer sends any token on any chain. We route, bridge, and settle to your wallet in USDC.' },
]

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <div className="min-h-screen bg-background text-foreground font-mono selection:bg-foreground selection:text-background relative overflow-hidden">
      <main className="relative">

        {/* ═══════════════════════════════════════════════════════════
            HERO — Typographic + Grid Dot Background
        ═══════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-hidden">
          {/* Flickering grid background */}
          <FlickeringGrid
            className="absolute inset-0 z-0 size-full"
            squareSize={4}
            gridGap={6}
            color="#C0C0C0"
            maxOpacity={0.5}
            flickerChance={0.1}
          />
          {/* Top fade from navbar */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-[1]" />

          <div className="relative z-10 flex flex-col items-center text-center px-4 space-y-10">
           

            {/* Main title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-foreground leading-[0.9]"
            >
              FLASH_PROTOCOL
            </motion.h1>

            {/* Subtitle as terminal command */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center gap-2 text-sm text-muted-foreground max-w-lg"
            >
              <span>Cross-chain payment orchestration. <br />Accept crypto on any chain, settle instantly in USDC.</span>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <motion.div whileHover={isConnected ? { scale: 1.05 } : {}} whileTap={isConnected ? { scale: 0.95 } : {}}>
                {isConnected ? (
                  <Link href="/dashboard" className="bg-foreground text-background px-8 h-[40px] text-sm font-bold hover:bg-foreground/90 transition-colors inline-flex items-center justify-center">
                    DASHBOARD 
                  </Link>
                ) : (
                  <div>
                    <ConnectButton label=" CONNECT_WALLET " showBalance={false} />
                  </div>
                )}
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/#pipeline"
                  className="border border-border px-8 h-[40px] text-sm font-bold transition-colors bg-background hover:bg-muted/50 inline-flex items-center justify-center"
                >
                   LEARN_MORE 
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </section>

        {/* ═══════════════════════════════════════════════════════════
            NETWORK STATUS — Terminal Window Block
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.h4
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-sm font-mono text-muted-foreground mb-6 tracking-widest uppercase text-center"
            >
              [ NETWORK_STATUS ]
            </motion.h4>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border border-border bg-background overflow-hidden"
            >
              {/* Terminal title bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">flash-protocol — supported chains</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-foreground/20" />
                  <div className="w-2 h-2 bg-foreground/20" />
                  <div className="w-2 h-2 bg-foreground/20" />
                </div>
              </div>

              {/* Chain list */}
              <div className="p-4 space-y-0">
                {/* Table header */}
                <div className="grid grid-cols-[2rem_1fr_6rem_5rem] gap-4 text-[10px] text-muted-foreground uppercase tracking-widest pb-2 border-b border-border">
                  <span>#</span>
                  <span>Network</span>
                  <span className="text-right">Chain ID</span>
                  <span className="text-right">Status</span>
                </div>

                {SUPPORTED_CHAINS.map((chain, i) => (
                  <motion.div
                    key={chain.id}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="grid grid-cols-[2rem_1fr_6rem_5rem] gap-4 py-2.5 border-b border-border/50 text-sm hover:bg-muted/20 transition-colors group"
                  >
                    <span className="text-muted-foreground text-xs">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-foreground font-medium group-hover:text-foreground/80">{chain.name}</span>
                    <span className="text-right text-muted-foreground text-xs font-mono">{chain.id}</span>
                    <span className="text-right flex items-center justify-end gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-xs text-muted-foreground">live</span>
                    </span>
                  </motion.div>
                ))}

                {/* Summary line */}
                <div className="pt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{SUPPORTED_CHAINS.length} networks indexed · 70+ supported via aggregation</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    all systems operational
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            PIPELINE — 3 Horizontal Cards
        ═══════════════════════════════════════════════════════════ */}
        <section id="pipeline" className="min-h-screen flex items-center justify-center py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-block px-4 py-1.5 border border-border mb-6">
                <span className="text-foreground font-mono text-xs tracking-widest uppercase">How It Works</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-3">
                Payment Pipeline
              </h2>
              <p className="text-muted-foreground font-mono text-sm">
                3 steps from setup to settlement
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {PIPELINE_STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ y: -4 }}
                  className="group border border-border bg-background p-6 md:p-8 hover:border-foreground/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-2.5 py-1.5 bg-foreground text-background text-xs font-bold font-mono">
                      {step.num}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">$ flash {step.cmd}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            BENEFITS — Metrics Grid
        ═══════════════════════════════════════════════════════════ */}
        <section id="features" className="py-24 px-4 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-block px-4 py-1.5 border border-border mb-6">
                <span className="text-foreground font-mono text-xs tracking-widest uppercase">Why Flash Protocol</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-3">
                Built for Scale
              </h2>
              <p className="text-muted-foreground font-mono text-sm">
                Infrastructure-grade payment orchestration
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
              {BENEFITS.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -3 }}
                  className="group bg-background p-8 hover:bg-muted/20 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="inline-flex p-3 border border-border text-foreground group-hover:bg-foreground group-hover:text-background transition-all duration-300">
                      <benefit.icon className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground tracking-tight">{benefit.stat}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{benefit.unit}</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{benefit.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            FOOTER CTA
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-32 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground mb-4">
                Start accepting payments
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Create your first payment link in under 60 seconds. No integration required — just connect your wallet.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              {isConnected ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/dashboard/create"
                    className="bg-foreground text-background px-8 h-[40px] text-sm font-bold hover:bg-foreground/90 transition-colors inline-flex items-center gap-2"
                  >
                     CREATE_PAYMENT_LINK  <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              ) : (
                <div>
                  <ConnectButton label=" CONNECT_WALLET " showBalance={false} />
                </div>
              )}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/docs"
                  className="border border-border px-8 h-[40px] text-sm font-bold transition-colors bg-background hover:bg-muted/50 inline-flex items-center justify-center"
                >
                   VIEW_DOCS 
                </Link>
              </motion.div>
            </motion.div>

            {/* Subtle system status */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="pt-8"
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 border border-border text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>mainnet · 6 providers · 70+ chains</span>
              </div>
            </motion.div>
          </div>
        </section>

      </main>
    </div>
  )
}
