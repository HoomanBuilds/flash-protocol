'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { toolsDocsConfig } from "@/config/docs"
import { cn } from "@/lib/utils"

interface DocsNavProps {
  onLinkClick?: () => void
}

export function DocsNav({ onLinkClick }: DocsNavProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {toolsDocsConfig.map((section, i) => (
        <div key={i} className="space-y-2">
          <h4 className="text-xs font-bold tracking-widest uppercase text-muted-foreground font-mono pl-2">
            {section.title}
          </h4>
          <div className="space-y-0.5">
            {section.items.map((item, j) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={j}
                  href={item.disabled ? '#' : item.href}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm font-mono transition-colors",
                    isActive 
                      ? "bg-foreground text-background font-medium" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    item.disabled && "opacity-40 pointer-events-none"
                  )}
                >
                  {item.icon && <item.icon className="w-3.5 h-3.5" />}
                  {item.title}
                  {item.label && (
                    <span className="ml-auto text-[10px] font-mono border border-border px-1.5 py-0.5 text-muted-foreground">
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
