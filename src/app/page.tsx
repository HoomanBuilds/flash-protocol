'use client'

import { Zap, Globe2, ShieldCheck, Percent, Wallet, Layers, Cpu, Network, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import PixelBlast from '@/components/ui/pixel-blast'
import GradientText from '@/components/ui/gradient-text'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useAccount } from 'wagmi'

export default function Home() {
  const { isConnected } = useAccount()
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  return (
    <div className="min-h-screen bg-background text-foreground font-mono selection:bg-foreground selection:text-background relative overflow-hidden">
      <main className="relative" ref={containerRef}>
        {/* Hero Section */}
        <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-hidden bg-white">
          <div className="absolute inset-0 z-0">
            <PixelBlast
              variant="square"
              pixelSize={4}
              color="#bababa"
              patternScale={3}
              enableRipples
              rippleSpeed={0.4}
              rippleThickness={0.12}
              rippleIntensityScale={1.5}
              liquid={false}
              speed={4}
              edgeFade={0.25}
              transparent
            />
          </div>
          <section className="space-y-12 pt-12 flex flex-col items-center text-center relative z-10 w-full">
            <div className="space-y-8 w-full flex flex-col items-center">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-black leading-[0.9]">
                FLASH PROTOCOL
              </h1>
              <p className="text-md font-medium text-center max-w-2xl px-4 leading-relaxed bg-white/50 backdrop-blur-sm p-2 border border-black/5">
                Cross-Chain Payment Orchestration
                <br />
                Accept Crypto on Any Chain, Settle Instantly
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.div whileHover={isConnected ? { scale: 1.05 } : {}} whileTap={isConnected ? { scale: 0.95 } : {}}>
                {isConnected ? (
                  <Link href="/dashboard" className="bg-foreground text-background px-8 py-3 text-sm font-bold hover:bg-foreground/90 transition-colors inline-block text-center">
                    [ DASHBOARD ]
                  </Link>
                ) : (
                  <div className="scale-105">
                    <ConnectButton label="[ CONNECT_WALLET ]" showBalance={false} />
                  </div>
                )}
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/#features"
                  className="border border-border px-8 py-3 text-sm font-bold transition-colors bg-white inline-block"
                >
                  [ LEARN_MORE ]
                </Link>
              </motion.div>
            </div>
          </section>
        </div>

        {/* Scrolling Chain Marquee */}
        <div className="w-full mt-20 mb-12 overflow-hidden">
          <h4 className="text-sm font-mono text-black/40 mb-8 tracking-widest uppercase text-center">[ SUPPORTED ECOSYSTEMS ]</h4>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
            <div className="flex animate-scroll">
              {[...Array(2)].map((_, setIndex) => (
                <div key={setIndex} className="flex items-center gap-24 px-12">
                  {[
                    { name: 'Ethereum', icon: Layers },
                    { name: 'Arbitrum', icon: Cpu },
                    { name: 'Optimism', icon: Network },
                    { name: 'Base', icon: Globe2 },
                    { name: 'Polygon', icon: Layers },
                    { name: 'Avalanche', icon: Zap },
                  ].map((chain, i) => (
                    <div key={`${setIndex}-${i}`} className="flex flex-col items-center gap-4 opacity-60 hover:opacity-100 transition-opacity">
                      <chain.icon className="w-16 h-16 text-black" />
                      <span className="font-mono text-lg text-black font-medium">{chain.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settlement Chains Grid */}
        <div className="w-full max-w-5xl mx-auto mb-24 px-4">
          <h4 className="text-sm font-mono text-black/40 mb-8 tracking-widest uppercase text-center">[ SETTLEMENT CHAINS ]</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Ethereum', chainId: '1', Icon: Layers },
              { name: 'Arbitrum', chainId: '42161', Icon: Cpu },
              { name: 'Base', chainId: '8453', Icon: Globe2 },
              { name: 'Optimism', chainId: '10', Icon: Network },
            ].map((chain, i) => (
              <div
                key={i}
                className="group relative bg-white border border-black/10 p-8 hover:border-black/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="absolute top-4 right-4 px-2 py-1 bg-black/5 text-black/40 font-mono text-xs">
                  {chain.chainId}
                </div>
                <div className="w-24 h-24 bg-black/5 flex items-center justify-center mb-5 group-hover:bg-black/10 transition-colors">
                  <chain.Icon className="w-16 h-16 text-black" />
                </div>
                <h5 className="font-mono text-lg font-bold text-black mb-1">{chain.name}</h5>
                <p className="font-mono text-sm text-black/40 uppercase tracking-wider">Settlement</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-black/5 border border-black/10 font-mono text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-black/50">All networks operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="relative py-24 overflow-hidden bg-white">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>
          <div className="relative z-10 container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-block px-4 py-1.5 border border-black/20 mb-6">
                <span className="text-black font-mono text-xs tracking-widest uppercase">How It Works</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-mono font-bold text-black mb-3">
                Create Payment Links
              </h2>
              <p className="text-black/50 font-mono text-sm">
                3 steps from idea to live payment
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { num: '01', title: 'Configure', desc: 'Set amount, token, and settlement chain. All from your dashboard.' },
                { num: '02', title: 'Share Link', desc: 'Generate a unique payment URL. Share it anywhere — email, socials, QR code.' },
                { num: '03', title: 'Get Paid', desc: 'Accept any token. We route and bridge automatically. Settle in USDC.' },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative bg-gray-50 border border-black/10 overflow-hidden hover:border-black/30 hover:shadow-xl transition-all duration-300 p-8"
                >
                  <div className="px-2 py-1 bg-black text-white font-mono text-[10px] font-bold inline-block mb-6">
                    STEP {step.num}
                  </div>
                  <h3 className="font-mono text-xl font-bold text-black mb-3">
                    {step.title}
                  </h3>
                  <p className="font-mono text-sm text-black/50 leading-relaxed">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex justify-center mt-12"
            >
              <div className="inline-flex items-center gap-4 px-6 py-3 bg-black/5 border border-black/10 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-black/50">System Active</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <span className="text-black/30">Scroll to explore</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Global Benefits — Dark Band */}
        <section className="relative py-32 overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 bg-slate-950">
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-background via-background/80 to-transparent z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
          </div>

          <div className="relative z-10 container mx-auto px-4">
            <div className="text-center mb-24 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 backdrop-blur-md"
              >
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs font-mono text-white/80 font-bold tracking-wider">LIVE ON MAINNET</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-bold tracking-tight text-white font-mono"
              >
                The Future of Payments
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
              >
                Accept crypto worldwide with instant settlement, lower fees, and zero complexity.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32">
              {[
                { title: 'Global Reach', subtitle: '70+ Chains', desc: 'Accept payments from customers on any supported chain.', icon: Globe2 },
                { title: 'Instant Settlement', subtitle: 'No T+2 Delays', desc: 'Receive funds immediately. No waiting.', icon: Zap },
                { title: 'Lower Fees', subtitle: 'Save vs Cards', desc: 'Drastically reduce processing costs vs traditional rails.', icon: Percent },
                { title: 'Stable Value', subtitle: 'USDC Settlement', desc: 'Never worry about volatility with stablecoin settlement.', icon: Wallet },
                { title: 'Non-Custodial', subtitle: 'Your Keys', desc: 'Funds go directly to your wallet. We never touch them.', icon: ShieldCheck },
                { title: 'Cross-Chain', subtitle: 'Auto-Bridge', desc: 'We handle bridging and swapping behind the scenes.', icon: Layers },
              ].map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group relative"
                >
                  <div className="relative h-full p-8 border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden">
                    <div className="relative z-10">
                      <div className="mb-6 inline-flex p-3 bg-white/5 border border-white/10 text-white group-hover:scale-110 transition-all duration-300">
                        <benefit.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">{benefit.title}</h3>
                      <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 text-xs font-mono text-white/60 mb-4">
                        {benefit.subtitle}
                      </div>
                      <p className="text-gray-400 leading-relaxed text-sm">{benefit.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
