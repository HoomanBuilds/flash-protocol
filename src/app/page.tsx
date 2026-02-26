'use client'

import { useState, useEffect } from 'react'
import { Zap, Globe2, ShieldCheck, Percent, Wallet, Layers, ArrowRight, Activity, Terminal } from 'lucide-react'
import Link from 'next/link'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { motion } from 'framer-motion'
import { toast } from '@/components/ui/use-toast'
import DottedMap from '@/components/ui/dotted-map'

const SUPPORTED_CHAINS = [
  { name: 'Ethereum', id: '1', status: 'active' },
  { name: 'Arbitrum', id: '42161', status: 'active' },
  { name: 'Optimism', id: '10', status: 'active' },
  { name: 'Base', id: '8453', status: 'active' },
  { name: 'Polygon', id: '137', status: 'active' },
  { name: 'Avalanche', id: '43114', status: 'active' },
]

const FEATURES = [
  { 
    title: 'Global Reach', 
    stat: '70+',
    unit: 'Chains',
    desc: 'Accept payments from customers on any supported blockchain network.', 
    icon: Globe2,
    className: "md:col-span-2"
  },
  { 
    title: 'Instant Settlement', 
    stat: '<30',
    unit: 'Seconds',
    desc: 'Receive funds immediately. No T+2 delays, no waiting.', 
    icon: Zap,
    className: "md:col-span-1"
  },
  { 
    title: 'Lower Fees', 
    stat: '80%',
    unit: 'Savings',
    desc: 'Drastically reduce processing costs versus traditional card rails.', 
    icon: Percent,
    className: "md:col-span-1"
  },
  { 
    title: 'Non-Custodial', 
    stat: '0',
    unit: 'Trust Required',
    desc: 'Funds go directly to your wallet. We never hold your money.', 
    icon: ShieldCheck,
    className: "md:col-span-1"
  },
  { 
    title: 'Stable Settlement', 
    stat: 'USDC',
    unit: 'Default',
    desc: 'Never worry about crypto volatility with stablecoin settlement.', 
    icon: Wallet,
    className: "md:col-span-1"
  },
  { 
    title: 'Auto-Bridge', 
    stat: 'Any→Any',
    unit: 'Route',
    desc: 'We handle cross-chain bridging and swapping behind the scenes.', 
    icon: Layers,
    className: "md:col-span-2"
  },
]

const PIPELINE_STEPS = [
  { num: '01', cmd: 'configure', title: 'Set Parameters', desc: 'Define amount, accepted tokens, and your settlement chain from the dashboard.' },
  { num: '02', cmd: 'generate', title: 'Create Payment Link', desc: 'Generate a unique URL. Share via email, embed in your site, or print a QR code.' },
  { num: '03', cmd: 'settle', title: 'Receive Funds', desc: 'Payer sends any token on any chain. We route, bridge, and settle to your wallet in USDC.' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
}

export default function Home() {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only trust wallet state after hydration to prevent SSR mismatch
  const walletReady = mounted && isConnected

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background text-base">
      
      {/* 
        ═══════════════════════════════════════════════════════════
        HERO SECTION - Modern Monochrome
        ═══════════════════════════════════════════════════════════
      */}
      <section className="relative min-h-screen flex items-center pt-20 pb-20 px-6 border-b border-border">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-6xl md:text-8xl font-sans font-bold tracking-tighter leading-[0.9] mb-6">
                PROTOCOL FOR THE WORLD.
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-lg leading-relaxed">
                Connect value across 70+ chains. Instant settlement. Zero friction.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <div className="flex gap-4">
                {walletReady ? (
                  <Link href="/dashboard" className="h-12 px-8 bg-foreground text-background font-medium flex items-center justify-center hover:opacity-90 transition-opacity">
                    OPEN DASHBOARD
                  </Link>
                ) : (
                  <button onClick={() => open()} className="h-12 px-8 bg-foreground text-background font-medium flex items-center justify-center hover:opacity-90 transition-opacity">
                    CONNECT WALLET
                  </button>
                )}
                <Link href="/docs" className="h-12 px-8 border border-border flex items-center justify-center hover:bg-muted/50 transition-colors font-mono text-sm">
                  READ_DOCS
                </Link>
              </div>
            </motion.div>
          </div>




          {/* Abstract Map Visualization */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 1 }}
            className="relative min-h-[400px] flex items-center justify-center"
          >
             <div className="absolute -top-4 -left-4 w-24 h-24 border-t border-l border-foreground/20" />
             <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b border-r border-foreground/20" />
             <DottedMap className="w-full h-full opacity-80" />
          </motion.div>

        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════════════════════
        TICKER / STATS
        ═══════════════════════════════════════════════════════════
      */}
      <div className="border-b border-border overflow-hidden bg-background">
         <div className="flex items-center text-xs font-mono tracking-widest text-muted-foreground py-3 animate-marquee whitespace-nowrap">
            {SUPPORTED_CHAINS.map(c => (
              <span key={c.id} className="mx-8 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full" />
                {c.name.toUpperCase()} [{c.id}] :: STATUS_OK
              </span>
            ))}
            {SUPPORTED_CHAINS.map(c => (
              <span key={`${c.id}-dup`} className="mx-8 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full" />
                {c.name.toUpperCase()} [{c.id}] :: STATUS_OK
              </span>
            ))}
         </div>
      </div>

      {/* 
        ═══════════════════════════════════════════════════════════
        WHY FLASH PROTOCOL (BENTO GRID)
        ═══════════════════════════════════════════════════════════
      */}
      <section className="py-32 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-8">
            <h2 className="text-4xl md:text-6xl font-sans font-bold tracking-tight mb-4">Why Flash Protocol</h2>
             <p className="text-lg text-muted-foreground max-w-xl">
                Built for scale. Infrastructure-grade payment orchestration.
             </p>
            <div className="w-24 h-1 bg-foreground mt-4" />
          </div>

          <motion.div 
             variants={containerVariants}
             initial="hidden"
             whileInView="visible"
             viewport={{ once: true, amount: 0.2 }}
             className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px]"
          >
             {FEATURES.map((feature, i) => (
               <motion.div
                 key={feature.title}
                 variants={itemVariants}
                 whileHover={{ y: -5 }}
                 className={`
                   group relative p-6 border border-border bg-background hover:bg-muted/5 transition-all duration-300
                   flex flex-col justify-between
                   ${feature.className}
                 `}
               >
                 <div className="flex justify-between items-start mb-4">
                    <div className="inline-flex p-3 border border-border text-foreground group-hover:bg-foreground group-hover:text-background transition-all duration-300">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    {feature.stat && (
                     <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-bold tracking-tighter">{feature.stat}</span>
                       <span className="text-xs font-mono text-muted-foreground uppercase">{feature.unit}</span>
                     </div>
                   )}
                 </div>
                 
                 <div>
                   <h3 className="text-lg font-bold mb-1">{feature.title}</h3>
                   <p className="text-muted-foreground leading-snug text-sm">{feature.desc}</p>
                 </div>
               </motion.div>
             ))}
          </motion.div>
        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════════════════════
        PIPELINE — 3 Horizontal Cards
        ═══════════════════════════════════════════════════════════
      */}
      <section id="pipeline" className="py-32 px-6 border-t border-border">
          <div className="max-w-[1400px] mx-auto w-full">
            <div className="mb-16">
              <h2 className="text-4xl md:text-6xl font-sans font-bold tracking-tight mb-4">How It Works</h2>
               <p className="text-lg text-muted-foreground max-w-xl">
                  Streamlined pipeline. From configuration to settlement in 3 steps.
               </p>
              <div className="w-24 h-1 bg-foreground mt-4" />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PIPELINE_STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ y: -5 }}
                  className="group relative p-8 border border-border bg-background hover:bg-muted/5 transition-all duration-300 flex flex-col justify-between min-h-[240px]"
                >
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-5xl font-bold tracking-tighter text-foreground/10 group-hover:text-foreground/20 transition-colors">
                      0{step.num}
                    </span>
                    <div className="px-3 py-1 border border-border text-xs font-mono text-muted-foreground bg-muted/20">
                      $ flash {step.cmd}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
      </section>

      {/* 
        ═══════════════════════════════════════════════════════════
         CTA FOOTER
        ═══════════════════════════════════════════════════════════
      */}
      <section className="py-32 px-6 border-t border-border bg-foreground text-background">
         <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter mb-16">
              READY TO SCALE?
            </h2>
            

            <div className="grid md:grid-cols-2 gap-12 text-center">
              {/* Option 1: No-Code Dashboard */}
              <div className="space-y-6 flex flex-col items-center">
                 <h3 className="text-2xl font-bold">No-Code Dashboard</h3>
                 <p className="text-background/70 text-lg leading-relaxed h-24 max-w-sm mx-auto">
                   Create payment links, manage aggregators, and track settlements directly from our interface. No coding required.
                 </p>
                  <Link 
                   href="/dashboard" 
                   onClick={(e) => {
                     if (!walletReady) {
                       e.preventDefault()
                       toast({
                         title: 'WALLET REQUIRED',
                         description: 'Please connect your wallet to access the dashboard.',
                         variant: 'destructive',
                       })
                     }
                   }}
                   className="inline-flex items-center gap-2 text-xl font-medium border-b-2 border-background hover:opacity-70 transition-opacity"
                 >
                   Launch Dashboard <ArrowRight className="w-5 h-5" />
                 </Link>
              </div>

              {/* Option 2: API Integration */}
              <div className="space-y-6 flex flex-col items-center">
                 <h3 className="text-2xl font-bold">API Integration</h3>
                 <p className="text-background/70 text-lg leading-relaxed h-24 max-w-sm mx-auto">
                   Programmatically generate links and webhooks. Integrate our entire settlement infrastructure into your app.
                 </p>
                 <Link href="/docs" className="inline-flex items-center gap-2 text-xl font-medium border-b-2 border-background hover:opacity-70 transition-opacity">
                   Read Documentation <Terminal className="w-5 h-5" />
                 </Link>
              </div>
            </div>
         </div>
      </section>

    </div>
  )
}
