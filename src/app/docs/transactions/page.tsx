import { DocHeader, DocSection, DocCodeBlock, MultiLangCodeBlock } from "@/components/docs/DocComponents"

export default function DocsTransactionsPage() {
  return (
    <div>
      <DocHeader 
        heading="Transactions" 
        text="Retrieve and reconcile payments."
      />
      
      {/* LIST */}
      <DocSection title="List Transactions">
        <p className="mb-4">
          Fetch a paginated list of transactions across all your payment links.
        </p>
        <div className="flex items-center gap-2 mb-4">
            <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">GET</span>
            <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/transactions</code>
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-4 mb-2">Query Parameters</h3>
        <div className="border border-border divide-y divide-border mb-4">
            <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-3 gap-4 font-bold uppercase tracking-wider">
                <div>Parameter</div>
                <div>Required</div>
                <div>Description</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>limit</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Items per page (default: 10, max: 100).</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>offset</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Pagination offset (default: 0).</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>status</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Filter by status (e.g. &quot;completed&quot;).</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>payment_link_id</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Filter by a specific payment link.</div>
            </div>
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Request Example</h3>
        <MultiLangCodeBlock 
          snippets={{
            bash: `curl -X GET "https://flash-protocol.vercel.app/api/v1/transactions?limit=10&status=completed" \\
  -H "Authorization: Bearer pg_live_8cd80b..."`,
            js: `const params = new URLSearchParams({
  limit: '10',
  status: 'completed'
});

const response = await fetch(\`https://flash-protocol.vercel.app/api/v1/transactions?\${params}\`, {
  headers: {
    'Authorization': 'Bearer pg_live_...'
  }
});

const { data, count } = await response.json();`
          }}
        />
        
        <DocCodeBlock 
          title="200 OK"
          code={`{
  "data": [
    {
      "id": "tx_987654321",
      "payment_link_id": "pl_abc123",
      "status": "completed",
      "customer_wallet": "0x123...abc",
      "source_chain_id": 1,
      "source_token_symbol": "ETH",
      "source_amount": "0.015",
      "actual_output": "49.99",
      "source_tx_hash": "0xdef...",
      "completed_at": "2024-03-20T14:05:00Z",
      "created_at": "2024-03-20T14:04:30Z"
    }
  ],
  "count": 1,
  "limit": 10,
  "offset": 0
}`}
        />
      </DocSection>

      {/* GET SINGLE */}
      <DocSection title="Get Transaction by ID">
        <p className="mb-4">
          Retrieve full details for a single transaction. Use this to verify payment status before fulfilling orders.
        </p>
        <div className="flex items-center gap-2 mb-4">
            <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">GET</span>
            <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/transactions/:id</code>
        </div>

        <MultiLangCodeBlock 
          snippets={{
            bash: `curl -X GET https://flash-protocol.vercel.app/api/v1/transactions/tx_987654321 \\
  -H "Authorization: Bearer pg_live_8cd80b..."`,
            js: `const txId = 'tx_987654321';

const response = await fetch(\`https://flash-protocol.vercel.app/api/v1/transactions/\${txId}\`, {
  headers: { 'Authorization': 'Bearer pg_live_...' }
});

const transaction = await response.json();

if (transaction.status === 'completed') {
  // ✅ Payment verified — fulfill order
}`
          }}
        />

        <DocCodeBlock 
          title="200 OK"
          code={`{
  "id": "tx_987654321",
  "payment_link_id": "pl_abc123",
  "status": "completed",
  "customer_wallet": "0x123...abc",
  "source_chain_id": 1,
  "source_token_symbol": "ETH",
  "source_amount": "0.015",
  "actual_output": "49.99",
  "destination_chain_id": 8453,
  "destination_token_symbol": "USDC",
  "source_tx_hash": "0xdef...",
  "destination_tx_hash": "0xaaa...",
  "completed_at": "2024-03-20T14:05:00Z",
  "created_at": "2024-03-20T14:04:30Z"
}`}
        />

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Transaction Statuses</h3>
        <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 text-[10px] font-mono border border-border">pending</span>
            <span className="px-2 py-1 text-[10px] font-mono border border-border">processing</span>
            <span className="px-2 py-1 text-[10px] font-mono border border-border bg-foreground text-background">completed</span>
            <span className="px-2 py-1 text-[10px] font-mono border border-border">failed</span>
            <span className="px-2 py-1 text-[10px] font-mono border border-border">expired</span>
        </div>
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
                <div>401</div>
                <div>Unauthorized</div>
                <div className="text-muted-foreground">Invalid or missing API key.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>403</div>
                <div>Forbidden</div>
                <div className="text-muted-foreground">Transaction belongs to another merchant.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>404</div>
                <div>Not Found</div>
                <div className="text-muted-foreground">Transaction ID does not exist.</div>
            </div>
        </div>
      </DocSection>
    </div>
  )
}
