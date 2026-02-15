import { DocHeader, DocSection, DocCodeBlock, DocNote } from "@/components/docs/DocComponents"

export default function DocsRedirectsPage() {
  return (
    <div>
      <DocHeader 
        heading="Redirect Flow" 
        text="Handling user returns after payment."
      />
      
      <DocSection title="Overview">
        <p className="mb-4">
          When you create a Payment Link, you must provide a <code>success_url</code>. 
          Once the user completes the payment on our hosted page, they will see a success confirmation, 
          and after 3 seconds, they will be automatically redirected to your URL.
        </p>
        <p>
            This allows you to verify the payment status and show a "Thank You" page on your own domain.
        </p>
      </DocSection>

      <DocSection title="Query Parameters">
        <p className="mb-4">
          We append the following parameters to your <code>success_url</code> so you can identify the transaction:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-6 text-sm">
            <li><code>payment_id</code>: The ID of the Payment Link (e.g., <code>pl_...</code>).</li>
            <li><code>tx_hash</code>: The blockchain transaction hash of the payment.</li>
            <li><code>status</code>: The status of the payment (always <code>completed</code> for success redirects).</li>
        </ul>

        <DocCodeBlock 
            title="Example Redirect URL"
            language="text"
            code={`https://myapp.com/success?payment_id=pl_123&tx_hash=0xabc...&status=completed`}
        />
      </DocSection>

      <DocSection title="Verification (Critical)">
        <p className="mb-4">
          <strong>Do not trust the URL parameters alone.</strong> A malicious user could manually type <code>?status=completed</code> in their browser to spoof a successful payment.
        </p>
        <p className="mb-4">
          Since Webhooks are currently in development, you <strong>must</strong> verify the transaction status using our API before fulfilling the order.
        </p>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Recommended Flow</h3>
        <ol className="list-decimal pl-6 space-y-2 mb-6">
            <li>User completes payment and is redirected to your <code>success_url</code>.</li>
            <li>Your backend captures the <code>payment_id</code> from the query parameters.</li>
            <li>Your backend calls <code>GET /transactions?payment_link_id=...</code> to confirm the status is actually <code>completed</code>.</li>
            <li>If verified, fulfill the order.</li>
        </ol>

        <DocCodeBlock 
            title="Verification Example (Node.js)"
            language="js"
            code={`// 1. Get payment_id from URL query
const paymentId = req.query.payment_id;

// 2. Call API to verify
const response = await fetch(\`https://flashprotocol.com/api/v1/transactions?payment_link_id=\${paymentId}\`, {
  headers: { 'Authorization': 'Bearer ...' }
});

const { data } = await response.json();
const transaction = data[0]; // Get latest transaction

if (transaction && transaction.status === 'completed') {
  // ✅ Payment confirmed! Fulfill order.
} else {
  // ❌ Fraud attempt or pending. Do not fulfill.
}`}
        />
      </DocSection>

      <DocNote type="info">
        Webhooks will be available in the next release to automate this process without polling.
      </DocNote>
    </div>
  )
}
