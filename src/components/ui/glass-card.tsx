import { cn } from "@/lib/utils"
import React from "react"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'marketing' | 'dashboard' | 'solid'
  className?: string
}

export function GlassCard({ 
  children, 
  className, 
  variant = 'dashboard', 
  ...props 
}: GlassCardProps) {
  return (
    <div 
      className={cn(
        "relative rounded-xl border border-white/10 backdrop-blur-xl transition-all duration-300",
        // Marketing variant: lighter, more transparent
        variant === 'marketing' && "bg-white/5 hover:bg-white/10 hover:border-white/20 shadow-2xl shadow-black/10",
        // Dashboard variant: darker, more solid but still glass
        variant === 'dashboard' && "bg-black/40 hover:bg-black/50 hover:border-blue-500/30",
        // Solid fallback
        variant === 'solid' && "bg-card text-card-foreground border-border",
        className
      )} 
      {...props}
    >
      {/* Tech corner accents */}
      {variant !== 'solid' && (
        <>
          <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t border-l border-white/20 rounded-tl-xl pointer-events-none" />
          <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b border-r border-white/20 rounded-br-xl pointer-events-none" />
        </>
      )}
      
      {children}
    </div>
  )
}
