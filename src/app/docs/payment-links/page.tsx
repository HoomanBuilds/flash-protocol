import { DocHeader, DocSection, DocCodeBlock, DocNote, MultiLangCodeBlock } from "@/components/docs/DocComponents"

export default function DocsPaymentLinksPage() {
  return (
    <div>
      <DocHeader 
        heading="Payment Links" 
        text="Create and manage payment sessions."
      />
      
      {/* CREATE */}
      <DocSection title="Create a Payment Link">
        <p className="mb-4">
          This is the primary endpoint for integrating the Payment Gateway. It creates a new payment session URL that you can redirect your users to.
        </p>
        <div className="flex items-center gap-2 mb-4">
            <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">POST</span>
            <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/payment-links</code>
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Request Body</h3>
        <div className="mt-4 border border-border divide-y divide-border">
            <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-4 gap-4 font-bold uppercase tracking-wider">
                <div>Field</div>
                <div>Type</div>
                <div>Required</div>
                <div>Description</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>amount</div>
                <div className="text-muted-foreground">number</div>
                <div className="font-bold">Yes</div>
                <div className="text-muted-foreground">Amount to charge (positive).</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>success_url</div>
                <div className="text-muted-foreground">string</div>
                <div className="font-bold">Yes</div>
                <div className="text-muted-foreground">URL to redirect after payment.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>currency</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Default: &quot;USD&quot;.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>title</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Product name shown to payer.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>receive_token</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Token to receive (e.g. &quot;USDC&quot;).</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>receive_chain</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Chain name or ID (e.g. &quot;base&quot;, &quot;8453&quot;).</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>cancel_url</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">URL if user cancels payment.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>metadata</div>
                <div className="text-muted-foreground">object</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Custom key-value pairs for your use.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>max_uses</div>
                <div className="text-muted-foreground">integer</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Max number of payments allowed.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>expires_at</div>
                <div className="text-muted-foreground">ISO 8601</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Expiration datetime for the link.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>description</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Description shown to payer.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
                <div>use_stealth</div>
                <div className="text-muted-foreground">boolean</div>
                <div className="text-muted-foreground">No</div>
                <div className="text-muted-foreground">Enable stealth address privacy (requires merchant stealth setup).</div>
            </div>
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Request Example</h3>
        <MultiLangCodeBlock 
          snippets={{
            bash: `curl -X POST https://flash-protocol.vercel.app/api/v1/payment-links \\
  -H "Authorization: Bearer pg_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 49.99,
    "currency": "USD",
    "title": "Premium Subscription",
    "success_url": "https://myapp.com/success",
    "metadata": { "order_id": "ORD-123" }
  }'`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/payment-links', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pg_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 49.99,
    currency: 'USD',
    title: 'Premium Subscription',
    success_url: 'https://myapp.com/success',
    metadata: { order_id: 'ORD-123' }
  })
});

const paymentLink = await response.json();
// Redirect user to paymentLink.url`
          }}
        />

        <DocCodeBlock
          title="201 Created"
          code={`{
  "id": "pl_abc123456",
  "url": "https://flash-protocol.vercel.app/pay/pl_abc123456",
  "amount": 49.99,
  "currency": "USD",
  "status": "active",
  "title": "Premium Subscription",
  "description": null,
  "receive_token": "USDC",
  "receive_chain_id": "8453",
  "receive_token_symbol": "USDC",
  "use_stealth": false,
  "max_uses": null,
  "expires_at": null,
  "success_url": "https://myapp.com/success",
  "cancel_url": null,
  "created_at": "2024-03-20T14:00:00Z",
  "metadata": { "order_id": "ORD-123" }
}`}
        />
      </DocSection>

      {/* LIST */}
      <DocSection title="List Payment Links">
        <p className="mb-4">
          Retrieve a paginated list of all your payment links.
        </p>
        <div className="flex items-center gap-2 mb-4">
            <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">GET</span>
            <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/payment-links</code>
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-4 mb-2">Query Parameters</h3>
        <ul className="list-disc pl-6 space-y-2 mb-4 text-xs font-mono">
            <li><code>limit</code> — Max items to return (default: 10, max: 100).</li>
            <li><code>offset</code> — Pagination offset (default: 0).</li>
        </ul>

        <MultiLangCodeBlock 
          snippets={{
            bash: `curl -X GET "https://flash-protocol.vercel.app/api/v1/payment-links?limit=10" \\
  -H "Authorization: Bearer pg_live_..."`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/payment-links?limit=10', {
  headers: { 'Authorization': 'Bearer pg_live_...' }
});

const { data, count, limit, offset } = await response.json();`
          }}
        />

        <DocCodeBlock
          title="200 OK"
          code={`{
  "data": [ ... ],
  "count": 25,
  "limit": 10,
  "offset": 0
}`}
        />
      </DocSection>

      {/* GET SINGLE */}
      <DocSection title="Get Payment Link Details">
        <p className="mb-4">
          Retrieve full details for a specific payment link, including its 5 most recent transactions.
        </p>
        <div className="flex items-center gap-2 mb-4">
            <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">GET</span>
            <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/payment-links/:id</code>
        </div>

        <MultiLangCodeBlock 
          snippets={{
            bash: `curl -X GET https://flash-protocol.vercel.app/api/v1/payment-links/pl_abc123 \\
  -H "Authorization: Bearer pg_live_..."`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/payment-links/pl_abc123', {
  headers: { 'Authorization': 'Bearer pg_live_...' }
});

const link = await response.json();
console.log(link.status, link.transactions);`
          }}
        />

        <DocCodeBlock
          title="200 OK"
          code={`{
  "id": "pl_abc123456",
  "url": "https://flash-protocol.vercel.app/pay/pl_abc123456",
  "amount": 49.99,
  "currency": "USD",
  "status": "active",
  "title": "Premium Subscription",
  "description": null,
  "receive_token": "USDC",
  "receive_chain_id": "8453",
  "receive_token_symbol": "USDC",
  "use_stealth": false,
  "current_uses": 3,
  "max_uses": 10,
  "expires_at": null,
  "success_url": "https://myapp.com/success",
  "cancel_url": null,
  "metadata": { "order_id": "ORD-123" },
  "created_at": "2024-03-20T14:00:00Z",
  "updated_at": "2024-03-20T14:00:00Z",
  "transactions": [
    {
      "id": "tx_987654",
      "status": "completed",
      "actual_output": "49.99",
      "customer_wallet": "0x123...abc",
      "completed_at": "2024-03-20T14:05:00Z"
    }
  ]
}`}
        />
      </DocSection>

      {/* PATCH */}
      <DocSection title="Update Payment Link">
        <p className="mb-4">
          Update one or more fields on a payment link. All fields are optional — only include the fields you want to change.
        </p>
        <div className="flex items-center gap-2 mb-4">
            <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">PATCH</span>
            <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/payment-links/:id</code>
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Updatable Fields</h3>
        <div className="mt-4 border border-border divide-y divide-border">
            <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-3 gap-4 font-bold uppercase tracking-wider">
                <div>Field</div>
                <div>Type</div>
                <div>Description</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>status</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">&quot;active&quot;, &quot;paused&quot;, or &quot;archived&quot;.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>title</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">Product name shown to payer.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>description</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">Description shown to payer.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>max_uses</div>
                <div className="text-muted-foreground">integer</div>
                <div className="text-muted-foreground">Max number of payments allowed.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>expires_at</div>
                <div className="text-muted-foreground">ISO 8601 | null</div>
                <div className="text-muted-foreground">Expiration datetime (null to remove).</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>success_url</div>
                <div className="text-muted-foreground">string</div>
                <div className="text-muted-foreground">URL to redirect after payment.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>cancel_url</div>
                <div className="text-muted-foreground">string | null</div>
                <div className="text-muted-foreground">URL if user cancels payment.</div>
            </div>
            <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
                <div>metadata</div>
                <div className="text-muted-foreground">object</div>
                <div className="text-muted-foreground">Custom key-value pairs (replaces existing).</div>
            </div>
        </div>

        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X PATCH https://flash-protocol.vercel.app/api/v1/payment-links/pl_abc123 \\
  -H "Authorization: Bearer pg_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "paused",
    "title": "Updated Title",
    "metadata": { "order_id": "ORD-456" }
  }'`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/payment-links/pl_abc123', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer pg_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'paused',
    title: 'Updated Title',
    metadata: { order_id: 'ORD-456' }
  })
});

const link = await response.json();`
          }}
        />

        <DocCodeBlock
          title="200 OK"
          code={`{
  "id": "pl_abc123456",
  "url": "https://flash-protocol.vercel.app/pay/pl_abc123456",
  "amount": 49.99,
  "currency": "USD",
  "status": "paused",
  "title": "Updated Title",
  "description": null,
  "receive_token": "USDC",
  "receive_chain_id": "8453",
  "receive_token_symbol": "USDC",
  "use_stealth": false,
  "current_uses": 3,
  "max_uses": 10,
  "expires_at": null,
  "success_url": "https://myapp.com/success",
  "cancel_url": null,
  "metadata": { "order_id": "ORD-456" },
  "created_at": "2024-03-20T14:00:00Z",
  "updated_at": "2024-03-21T10:00:00Z"
}`}
        />
      </DocSection>

      <DocNote type="info">
        <strong>Tip:</strong> You can assume the payment is pending until the user is redirected to your <code>success_url</code> or you receive a webhook.
      </DocNote>
    </div>
  )
}
