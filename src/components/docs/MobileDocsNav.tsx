'use client'

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocsNav } from "./DocsNav"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export function MobileDocsNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close menu when route changes
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  return (
    <div className="md:hidden flex items-center border-b border-border bg-background px-4 py-3 sticky top-0 z-50">
      <Button 
        variant="ghost" 
        size="icon" 
        className="mr-2 -ml-2 h-8 w-8"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <span className="font-bold tracking-tight font-mono text-sm">DOCUMENTATION</span>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-3/4 max-w-sm border-r border-border bg-background shadow-xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <span className="font-bold tracking-tight font-mono">MENU</span>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="-mr-2 h-8 w-8"
                    onClick={() => setOpen(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </Button>
              </div>
              <div className="h-[calc(100vh-65px)] overflow-y-auto p-6">
                <DocsNav onLinkClick={() => setOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
