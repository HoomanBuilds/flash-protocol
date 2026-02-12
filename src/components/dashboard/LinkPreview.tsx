import { Wallet } from "lucide-react"

interface LinkPreviewProps {
  title?: string
  description?: string
  accepts?: {
    usdc: boolean
    usdt: boolean
    eth: boolean
  }
}

export function LinkPreview({ title, description, accepts }: LinkPreviewProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-muted/30 border border-border relative overflow-hidden">
      <div className="w-full max-w-md relative">
        <div className="mb-4 text-center">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">[ LIVE_PREVIEW ]</span>
        </div>

        <div className="w-full relative overflow-hidden border border-border bg-background p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono">PAYMENT_GATEWAY</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono border border-border text-muted-foreground">
              SECURE
            </span>
          </div>

          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {title || "Payment Title"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {description || "Enter a description for this payment link."}
              </p>
            </div>

            <div className="py-8 border-y border-border">
              <div className="flex items-end justify-center gap-2">
                <span className="text-5xl md:text-6xl font-bold text-foreground tracking-tighter">$0.00</span>
                <span className="text-xl text-muted-foreground mb-2 font-medium">USDC</span>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              {accepts?.usdc && <span className="px-3 py-1 text-xs font-mono border border-border text-muted-foreground">USDC</span>}
              {accepts?.usdt && <span className="px-3 py-1 text-xs font-mono border border-border text-muted-foreground">USDT</span>}
              {accepts?.eth && <span className="px-3 py-1 text-xs font-mono border border-border text-muted-foreground">ETH</span>}
            </div>

            <button disabled className="w-full py-4 bg-foreground text-background font-bold text-lg transition-all flex items-center justify-center gap-2 opacity-80">
              <Wallet className="w-5 h-5" />
              [ CONNECT_WALLET ]
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
