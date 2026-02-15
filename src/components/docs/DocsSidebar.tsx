'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { toolsDocsConfig } from "@/config/docs"
import { cn } from "@/lib/utils"

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-60 shrink-0 border-r border-border h-[calc(100vh-57px)] sticky top-[57px] hidden md:block overflow-y-auto bg-background">
      <div className="p-6 space-y-6">
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
    </div>
  )
}
