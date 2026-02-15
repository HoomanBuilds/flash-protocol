"use client"

import { cn } from "@/lib/utils"
import { Check, Copy, AlertTriangle, Info } from "lucide-react"
import { useState } from "react"

export function DocHeader({ heading, text }: { heading: string; text?: string }) {
  return (
    <div className="space-y-2 mb-8 pb-4 border-b border-border">
      <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono uppercase">{heading}</h1>
      {text && <p className="text-sm text-muted-foreground font-mono">{text}</p>}
    </div>
  )
}

export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-10 space-y-4">
            <h2 className="border-b border-border pb-2 text-lg font-bold tracking-tight font-mono uppercase text-foreground">
                {title}
            </h2>
            <div className="text-foreground/90 leading-7 text-sm">
                {children}
            </div>
        </section>
    )
}

type CodeSnippet = {
  language: string
  code: string
  title?: string
}

export function DocCodeBlock({ code, language = "json", title }: { code: string; language?: string; title?: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4">
        <div className="flex items-center justify-between px-4 py-2 bg-foreground border border-border">
            <span className="text-xs font-mono text-background/60 uppercase tracking-widest">{title || language}</span>
            <button
            onClick={onCopy}
            className="text-background/40 hover:text-background transition-colors"
            >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
        </div>
        <div className="p-4 overflow-x-auto bg-foreground/95 text-background border border-t-0 border-border">
            <pre className="font-mono text-xs leading-relaxed">
            <code>{code}</code>
            </pre>
        </div>
    </div>
  )
}

export function MultiLangCodeBlock({ snippets }: { snippets: Record<string, string> }) {
    const [activeLang, setActiveLang] = useState(Object.keys(snippets)[0])
    const [copied, setCopied] = useState(false)

    const onCopy = () => {
        navigator.clipboard.writeText(snippets[activeLang])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="my-4 border border-border bg-foreground text-background overflow-hidden">
            <div className="flex items-center justify-between px-2 bg-foreground border-b border-background/10">
                <div className="flex">
                    {Object.keys(snippets).map(lang => (
                        <button
                            key={lang}
                            onClick={() => setActiveLang(lang)}
                            className={cn(
                                "px-4 py-2.5 text-xs font-mono font-medium transition-colors border-b-2 uppercase tracking-wider",
                                activeLang === lang 
                                    ? "text-background border-background" 
                                    : "text-background/40 border-transparent hover:text-background/70"
                            )}
                        >
                            {lang === 'bash' ? 'cURL' : lang === 'js' ? 'Node.js' : lang.toUpperCase()}
                        </button>
                    ))}
                </div>
                <button
                    onClick={onCopy}
                    className="mr-2 text-background/40 hover:text-background transition-colors p-2"
                >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
            </div>
            <div className="p-4 overflow-x-auto bg-foreground/95">
                <pre className="font-mono text-xs leading-relaxed">
                    <code>{snippets[activeLang]}</code>
                </pre>
            </div>
        </div>
    )
}

export function DocNote({ type = "info", children }: { type?: "info" | "warning"; children: React.ReactNode }) {
    return (
        <div className={cn(
            "p-4 my-6 border flex gap-3 font-mono text-xs",
            type === 'info' 
              ? "bg-muted/30 border-border text-foreground" 
              : "bg-muted/50 border-foreground/30 text-foreground"
        )}>
            {type === 'info' 
              ? <Info className="h-4 w-4 shrink-0 mt-0.5" /> 
              : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            }
            <div className="leading-relaxed">
                {children}
            </div>
        </div>
    )
}
