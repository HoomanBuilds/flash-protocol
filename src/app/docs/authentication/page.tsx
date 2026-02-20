import { DocHeader, DocSection, DocCodeBlock, DocNote, MultiLangCodeBlock } from "@/components/docs/DocComponents"

export default function DocsAuthPage() {
  return (
    <div>
      <DocHeader 
        heading="Authentication" 
        text="Secure your API requests with API Keys."
      />
      
      <DocSection title="API Keys">
        <p className="mb-4">
          Authentication is performed via a <strong>Secret API Key</strong>. You can generate and manage these keys in the 
          Merchant Dashboard under <span className="font-medium bg-muted px-1 py-0.5 text-xs font-mono">Settings &gt; API Access</span>.
        </p>
        <p>
          Your API keys carry full administrative privileges for your account, so keep them secure. 
        </p>
      </DocSection>

      <DocNote type="warning">
        <strong>Security Warning:</strong> Never expose your Secret API Key in client-side code (browsers, mobile apps). 
        Only use it from your backend server.
      </DocNote>

      <DocSection title="Authorization Header">
        <p className="mb-4">
          Include your API Key in the <code>Authorization</code> header of all requests using the Bearer scheme.
        </p>
        <DocCodeBlock 
          title="HTTP Header"
          language="http" 
          code={`Authorization: Bearer pg_live_8cd80b...`} 
        />
      </DocSection>

      <DocSection title="Generate API Key">
        <p className="mb-4">
          Programmatically generate a new API key. This will revoke any existing key for the merchant.
        </p>
        <div className="flex items-center gap-2 mb-4">
            <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">POST</span>
            <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/auth/api-keys</code>
        </div>

        <DocNote type="info">
          This endpoint uses session authentication (httpOnly cookie), not API key auth. It is intended for use from the Dashboard or authenticated browser sessions.
        </DocNote>

        <DocCodeBlock 
          title="201 Created"
          code={`{
  "api_key": "pg_live_8cd80b4a9f2e...",
  "prefix": "pg_live_8cd80b4a",
  "created_at": "2024-03-20T14:00:00Z",
  "warning": "Save this key securely. You won't see it again."
}`}
        />
      </DocSection>

      <DocSection title="Revoke API Key">
        <p className="mb-4">
          Revoke your current API key. All API integrations using this key will stop working immediately.
        </p>
        <div className="flex items-center gap-2 mb-4">
            <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">DELETE</span>
            <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/auth/api-keys</code>
        </div>

        <DocCodeBlock 
          title="200 OK"
          code={`{
  "success": true,
  "message": "API key revoked successfully"
}`}
        />
      </DocSection>

      <DocSection title="Example Request">
        <MultiLangCodeBlock 
          snippets={{
            bash: `curl -X POST https://flash-protocol.vercel.app/api/v1/payment-links \\
  -H "Authorization: Bearer pg_live_8cd80b..." \\
  -H "Content-Type: application/json"
  -d '{
    "amount": 49.99,
    "currency": "USD",
    "title": "Premium Subscription",
    "success_url": "https://myapp.com/success"
  }'`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/payment-links', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pg_live_8cd80b...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 49.99,
    currency: 'USD',
    title: 'Premium Subscription',
    success_url: 'https://myapp.com/success'
  })
});

const data = await response.json();
console.log(data);`
          }}
        />
      </DocSection>
    </div>
  )
}
