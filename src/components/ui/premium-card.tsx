import React from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  badge?: string;
}

export function PremiumCard({
  children,
  className,
  title,
  badge,
  ...props
}: PremiumCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-2xl overflow-hidden font-sans text-zinc-100 transition-all duration-300",
        className
      )}
      {...props}
    >
      {/* Glow Effect */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header (Optional) */}
      {(title || badge) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 relative z-10">
          {title && (
            <div className="text-sm font-medium tracking-wide text-zinc-400 uppercase font-mono">
              {title}
            </div>
          )}
          {badge && (
            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              {badge}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-6 md:p-8 relative z-10">{children}</div>
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none z-0" />
    </div>
  );
}
