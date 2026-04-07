import { DocHeader, DocSection, DocCodeBlock, MultiLangCodeBlock } from '@/components/docs/DocComponents'

export default function DocsChainsTokensPage() {
  return (
    <div>
      <DocHeader
        heading="Chains & Tokens"
        text="Query supported chains and tokens."
      />

      {/* CHAINS */}
      <DocSection title="List Chains">
        <p className="mb-4">
          Retrieve all supported blockchain networks. Results are cached and refreshed every 5 minutes.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">GET</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/chains</code>
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-4 mb-2">Query Parameters</h3>
        <div className="border border-border divide-y divide-border mb-4">
          <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-3 gap-4 font-bold uppercase tracking-wider">
            <div>Parameter</div>
            <div>Required</div>
            <div>Description</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>type</div>
            <div className="text-muted-foreground">No</div>
            <div className="text-muted-foreground">Filter by type: &quot;all&quot; (default), &quot;evm&quot;, &quot;solana&quot;.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>hasUSDC</div>
            <div className="text-muted-foreground">No</div>
            <div className="text-muted-foreground">Set to &quot;true&quot; to only return chains with USDC support.</div>
          </div>
        </div>

        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X GET "https://flash-protocol.vercel.app/api/v1/chains?type=evm" \\
  -H "Authorization: Bearer pg_live_..."`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/chains?type=evm', {
  headers: { 'Authorization': 'Bearer pg_live_...' }
});

const { data, total } = await response.json();`,
          }}
        />

        <DocCodeBlock
          title="200 OK"
          code={`{
  "data": [
    {
      "key": "8453",
      "chainId": 8453,
      "name": "Base",
      "type": "evm",
      "symbol": "ETH",
      "logoUrl": "https://...",
      "providers": { "lifi": true, "rango": true }
    },
    {
      "key": "137",
      "chainId": 137,
      "name": "Polygon",
      "type": "evm",
      "symbol": "POL",
      "logoUrl": "https://...",
      "providers": { "lifi": true, "rango": true, "symbiosis": true }
    }
  ],
  "total": 2
}`}
        />
      </DocSection>

      {/* TOKENS */}
      <DocSection title="List Tokens">
        <p className="mb-4">
          Retrieve supported tokens for a specific chain. Results are cached and include spam filtering.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">GET</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/tokens</code>
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-4 mb-2">Query Parameters</h3>
        <div className="border border-border divide-y divide-border mb-4">
          <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-3 gap-4 font-bold uppercase tracking-wider">
            <div>Parameter</div>
            <div>Required</div>
            <div>Description</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>chainKey</div>
            <div className="font-bold">Yes</div>
            <div className="text-muted-foreground">Chain key (e.g. &quot;8453&quot;, &quot;137&quot;, &quot;solana&quot;).</div>
          </div>
        </div>

        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X GET "https://flash-protocol.vercel.app/api/v1/tokens?chainKey=8453" \\
  -H "Authorization: Bearer pg_live_..."`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/tokens?chainKey=8453', {
  headers: { 'Authorization': 'Bearer pg_live_...' }
});

const { data, total, chainKey } = await response.json();`,
          }}
        />

        <DocCodeBlock
          title="200 OK"
          code={`{
  "data": [
    {
      "address": "0x0000000000000000000000000000000000000000",
      "symbol": "ETH",
      "name": "Ethereum",
      "decimals": 18,
      "logoUrl": "https://...",
      "isNative": true,
      "chainKey": "8453"
    },
    {
      "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "symbol": "USDC",
      "name": "USD Coin",
      "decimals": 6,
      "logoUrl": "https://...",
      "isNative": false,
      "chainKey": "8453"
    }
  ],
  "chainKey": "8453",
  "total": 2
}`}
        />
      </DocSection>

      {/* ERROR CODES */}
      <DocSection title="Error Responses">
        <div className="border border-border divide-y divide-border">
          <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-3 gap-4 font-bold uppercase tracking-wider">
            <div>Status</div>
            <div>Code</div>
            <div>Description</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>400</div>
            <div>Bad Request</div>
            <div className="text-muted-foreground">Missing required chainKey parameter (tokens endpoint).</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>401</div>
            <div>Unauthorized</div>
            <div className="text-muted-foreground">Invalid or missing API key.</div>
          </div>
        </div>
      </DocSection>
    </div>
  )
}
