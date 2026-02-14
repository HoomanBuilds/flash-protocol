import { Book, Key, Link as LinkIcon, ArrowRightLeft, ShieldCheck, Webhook } from 'lucide-react'

export type DocSection = {
  title: string
  items: DocItem[]
}

export type DocItem = {
  title: string
  href: string
  icon?: any
  disabled?: boolean
  label?: string
}

export const toolsDocsConfig: DocSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs", icon: Book },
      { title: "Authentication", href: "/docs/authentication", icon: Key },
    ]
  },
  {
    title: "Core Resources",
    items: [
      { title: "Payment Links", href: "/docs/payment-links", icon: LinkIcon },
      { title: "Transactions", href: "/docs/transactions", icon: ArrowRightLeft },
    ]
  },
  {
    title: "Integration",
    items: [
      { title: "Redirect Flow", href: "/docs/redirects", icon: ArrowRightLeft },
      { title: "Webhooks", href: "/docs/webhooks", icon: Webhook, disabled: true, label: "Soon" },
    ]
  },
  {
    title: "Security",
    items: [
      { title: "Best Practices", href: "/docs/security", icon: ShieldCheck },
    ]
  }
]
