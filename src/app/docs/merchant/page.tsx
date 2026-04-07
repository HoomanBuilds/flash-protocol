import { DocHeader, DocSection, DocCodeBlock, MultiLangCodeBlock } from '@/components/docs/DocComponents'

export default function DocsMerchantPage() {
  return (
    <div>
      <DocHeader
        heading="Merchant"
        text="Retrieve and update your merchant profile."
      />

      {/* GET */}
      <DocSection title="Get Merchant Profile">
        <p className="mb-4">
          Retrieve your merchant profile including default receive settings and stealth privacy status.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">GET</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/merchant</code>
        </div>

        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X GET https://flash-protocol.vercel.app/api/v1/merchant \\
  -H "Authorization: Bearer pg_live_..."`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/merchant', {
  headers: { 'Authorization': 'Bearer pg_live_...' }
});

const merchant = await response.json();`,
          }}
        />

        <DocCodeBlock
          title="200 OK"
          code={`{
  "wallet_address": "0x1234...abcd",
  "business_name": "Acme Inc",
  "email": "billing@acme.com",
  "default_receive_chain": "8453",
  "default_receive_token": "USDC",
  "stealth_enabled": false,
  "created_at": "2024-03-15T12:00:00Z"
}`}
        />
      </DocSection>

      {/* PUT */}
      <DocSection title="Update Merchant Profile">
        <p className="mb-4">
          Update your default receive settings and profile information. All fields are optional — only include the fields you want to change.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">PUT</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/merchant</code>
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
            <div>default_receive_chain</div>
            <div className="text-muted-foreground">string | number | null</div>
            <div className="text-muted-foreground">No</div>
            <div className="text-muted-foreground">Default chain ID for receiving payments.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
            <div>default_receive_token</div>
            <div className="text-muted-foreground">string | null</div>
            <div className="text-muted-foreground">No</div>
            <div className="text-muted-foreground">Default token address for receiving payments.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
            <div>business_name</div>
            <div className="text-muted-foreground">string | null</div>
            <div className="text-muted-foreground">No</div>
            <div className="text-muted-foreground">Business display name (max 255 chars).</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
            <div>email</div>
            <div className="text-muted-foreground">string | null</div>
            <div className="text-muted-foreground">No</div>
            <div className="text-muted-foreground">Contact email address.</div>
          </div>
        </div>

        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X PUT https://flash-protocol.vercel.app/api/v1/merchant \\
  -H "Authorization: Bearer pg_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "default_receive_chain": "8453",
    "default_receive_token": "USDC",
    "business_name": "Acme Inc"
  }'`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/merchant', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer pg_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    default_receive_chain: '8453',
    default_receive_token: 'USDC',
    business_name: 'Acme Inc'
  })
});

const merchant = await response.json();`,
          }}
        />

        <DocCodeBlock
          title="200 OK"
          code={`{
  "wallet_address": "0x1234...abcd",
  "business_name": "Acme Inc",
  "email": "billing@acme.com",
  "default_receive_chain": "8453",
  "default_receive_token": "USDC",
  "stealth_enabled": false,
  "created_at": "2024-03-15T12:00:00Z"
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
            <div>Validation Error</div>
            <div className="text-muted-foreground">Invalid field values or no fields provided.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>401</div>
            <div>Unauthorized</div>
            <div className="text-muted-foreground">Invalid or missing API key.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>404</div>
            <div>Not Found</div>
            <div className="text-muted-foreground">Merchant profile not found.</div>
          </div>
        </div>
      </DocSection>
    </div>
  )
}
