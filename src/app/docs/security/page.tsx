import { DocHeader, DocSection, DocNote } from "@/components/docs/DocComponents"

export default function DocsSecurityPage() {
  return (
    <div>
      <DocHeader 
        heading="Security" 
        text="Best practices for integrating safely."
      />
      
      <DocSection title="API Key Safety">
        <ul className="list-disc pl-6 space-y-3 mb-4">
            <li><strong>Keep it Secret:</strong> Your API Key is a secret credential. Do not commit it to git, and do not expose it in frontend code.</li>
            <li><strong>Environment Variables:</strong> Store keys in environment variables (e.g., <code>PAYMENT_GATEWAY_API_KEY</code>) on your server.</li>
            <li><strong>Rotation:</strong> If you suspect a key is compromised, revoke it immediately in the Dashboard and generate a new one.</li>
        </ul>
      </DocSection>

      <DocSection title="Verification">
        <p className="mb-4">
            Do not rely solely on the frontend redirect to fulfill orders. A user could technically navigate to your success URL manually.
        </p>
        <p>
            Always verify the transaction status by:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4 text-sm font-medium">
            <li>Querying the API for the payment status.</li>
            <li>Checking the transaction hash on-chain (advanced users).</li>
            <li>Listening for webhooks (coming soon).</li>
        </ul>
      </DocSection>
    </div>
  )
}
