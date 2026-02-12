'use client'

import Link from 'next/link'
import { Terminal, Menu, X } from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="border-b border-border p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Terminal className="h-5 w-5" />
          <Link href="/">
            <span>FLASH PROTOCOL</span>
          </Link>
        </div>
        <nav className="hidden md:flex gap-12 text-sm ml-auto mr-12">
          <Link href="/dashboard" className="hover:underline decoration-2 underline-offset-4 font-bold text-primary">{'{dashboard}'}</Link>
          <Link href="/dashboard/create" className="hover:underline decoration-2 underline-offset-4">{'{create}'}</Link>
          <Link href="/#features" className="hover:underline decoration-2 underline-offset-4">{'{features}'}</Link>
        </nav>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
          
          
          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-background border-b border-border p-6 md:hidden flex flex-col gap-4 shadow-lg">
          <Link href="/dashboard" onClick={() => setIsOpen(false)} className="text-lg font-bold">{'{dashboard}'}</Link>
          <Link href="/dashboard/create" onClick={() => setIsOpen(false)} className="text-lg">{'{create}'}</Link>
          <Link href="/#features" onClick={() => setIsOpen(false)} className="text-lg">{'{features}'}</Link>
          <div className="pt-4 border-t border-border">
            <ConnectButton />
          </div>
        </div>
      )}
    </header>
  )
}
