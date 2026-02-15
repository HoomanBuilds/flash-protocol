import { DocHeader, DocSection, DocNote } from "@/components/docs/DocComponents"

export default function DocsIntroPage() {
  return (
    <div>
      <DocHeader 
        heading="Introduction" 
        text="Welcome to the Flash Protocol Payment Gateway API."
      />
      
      <DocSection title="Overview">
        <p className="mb-4">
          The Payment Gateway API allows you to programmatically create payment links, manage transactions, and integrate crypto payments directly into your application.
          We designed our API to be <strong>simple, RESTful, and secure</strong>.
        </p>
        <p>
          Whether you are building an e-commerce platform, a subscription service, or a specialized dApp, our API provides the tools you need to accept cross-chain payments effortlessly.
        </p>
      </DocSection>

      <DocSection title="Key Features">
        <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Universal Acceptance:</strong> Accept payments from Ethereum, Arbitrum, Polygon, Optimism, Base, and more.</li>
            <li><strong>Automatic Bridging:</strong> We handle the cross-chain complexity. You just receive your preferred token (e.g., USDC).</li>
            <li><strong>Instant Settlement:</strong> Funds are routed directly to your wallet in real-time.</li>
            <li><strong>Developer First:</strong> Webhooks, typed responses, and predictable error codes.</li>
        </ul>
      </DocSection>

      <DocNote type="info">
        <p className="font-semibold mb-1">Base URL</p>
        All API requests should be made to: <code className="bg-muted px-1.5 py-0.5 text-xs font-mono mx-1">https://flashprotocol.com/api/v1</code>
      </DocNote>
    </div>
  )
}
