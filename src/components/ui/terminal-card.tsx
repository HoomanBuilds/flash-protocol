import { cn } from "@/lib/utils"
import React from "react"

interface TerminalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  title?: string
  status?: 'active' | 'idle' | 'processing' | 'error' | 'success'
}

export function TerminalCard({ 
  children, 
  className, 
  title = "TERMINAL",
  status = 'active',
  ...props 
}: TerminalCardProps) {
  return (
    <div 
      className={cn(
        "relative rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-xl shadow-2xl overflow-hidden font-mono text-zinc-300",
        className
      )} 
      {...props}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-zinc-500 font-medium tracking-widest uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-zinc-700 animate-pulse" />
          {title}
        </div>
        <div className="text-[10px] text-zinc-600 uppercase">
           {status === 'active' && <span className="text-emerald-500">● ONLINE</span>}
           {status === 'processing' && <span className="text-yellow-500 animate-pulse">● PROCESSING</span>}
           {status === 'error' && <span className="text-red-500">● ERROR</span>}
           {status === 'success' && <span className="text-blue-500">● SUCCESS</span>}
           {status === 'idle' && <span>IDLE</span>}
        </div>
      </div>

      {/* Terminal Content Area */}
      <div className="p-6 relative">
        {/* Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" style={{ backgroundSize: "100% 2px, 3px 100%" }} />
        
        {children}
      </div>
    </div>
  )
}
