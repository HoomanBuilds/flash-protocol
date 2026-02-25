'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', requiresWallet: true },
  { href: '/#features', label: 'Features', requiresWallet: false },
  { href: '/docs', label: 'Docs', requiresWallet: false },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { primaryWallet } = useDynamicContext()
  const isConnected = !!primaryWallet

  const isActive = (href: string) => {
    if (href.startsWith('/#')) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleNavClick = (e: React.MouseEvent, link: typeof NAV_LINKS[0]) => {
    if (link.requiresWallet && !isConnected) {
      e.preventDefault()
      toast({
        title: ' WALLET_REQUIRED ',
        description: 'Connect your wallet to access this page.',
      })
      return
    }
  }

  return (
    <header className="border-b border-border p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="flex items-center justify-between px-2 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Image 
            src="/logo-black.png" 
            alt="Flash Protocol" 
            width={32} 
            height={32} 
            className="w-8 h-8"
          />
          <span>FLASH PROTOCOL</span>
        </Link>
        <nav className="hidden md:flex gap-12 text-sm ml-auto mr-12">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link)}
              className={`hover:underline decoration-2 underline-offset-4 transition-colors ${
                isActive(link.href)
                  ? 'font-bold text-foreground underline'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <DynamicWidget />
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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => {
                handleNavClick(e, link)
                setIsOpen(false)
              }}
              className={`text-lg ${isActive(link.href) ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-border">
            <DynamicWidget />
          </div>
        </div>
      )}
    </header>
  )
}
