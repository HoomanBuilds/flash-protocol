import { DocHeader, DocSection, DocCodeBlock, DocNote, MultiLangCodeBlock } from '@/components/docs/DocComponents'

export default function DocsWebhooksPage() {
  return (
    <div>
      <DocHeader
        heading="Webhooks"
        text="Receive real-time notifications for payment events."
      />

      <DocSection title="Overview">
        <p className="mb-4">
          Instead of polling the Transactions API for status changes, you can register <strong>webhook endpoints</strong> to receive
          real-time HTTP POST notifications when payment events occur. Flash Protocol signs every payload with HMAC-SHA256
          so you can verify authenticity.
        </p>
        <p>
          Deliveries are retried automatically with exponential backoff (up to 8 retries over ~24 hours) if your server
          returns a non-2xx response or times out.
        </p>
      </DocSection>

      <DocNote type="info">
        All webhook API endpoints require authentication via your API key in the <code className="bg-muted px-1.5 py-0.5 text-xs font-mono mx-1">Authorization</code> header.
        See <a href="/docs/authentication" className="underline underline-offset-4 hover:text-foreground">Authentication</a> for details.
      </DocNote>

      {/* QUICK START */}
      <DocSection title="Quick Start">
        <p className="mb-4">
          Get webhook notifications working in 3 steps:
        </p>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Step 1: Create an endpoint on your server</h3>
        <p className="mb-4">
          Set up an HTTPS route that accepts POST requests. Your endpoint must respond with a <code>2xx</code> status
          within 5 seconds, otherwise the delivery is treated as failed and retried.
        </p>
        <DocCodeBlock
          title="server.js"
          language="js"
          code={`import crypto from 'crypto';
import express from 'express';

const app = express();

// IMPORTANT: You need the raw body string for signature verification.
// Use express.raw() or a middleware that preserves it.
app.use('/webhooks/flash', express.raw({ type: 'application/json' }));

app.post('/webhooks/flash', (req, res) => {
  const rawBody = req.body.toString();
  const signature = req.headers['x-flash-signature'];

  // 1. Verify signature
  const secret = process.env.FLASH_WEBHOOK_SECRET; // whsec_...
  const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', rawSecret)
    .update(rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  // 2. Check timestamp to prevent replay attacks (reject if older than 5 min)
  const timestamp = parseInt(req.headers['x-flash-timestamp']);
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return res.status(401).send('Stale timestamp');
  }

  // 3. Process the event
  const event = JSON.parse(rawBody);

  switch (event.type) {
    case 'payment.completed':
      fulfillOrder(event.data.payment_link_id, event.data.transaction_id);
      break;
    case 'payment.failed':
      markOrderFailed(event.data.payment_link_id, event.data.error_message);
      break;
  }

  // 4. Respond 200 — this tells Flash Protocol the delivery succeeded
  res.status(200).send('OK');
});`}
        />

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Step 2: Register your endpoint with Flash Protocol</h3>
        <p className="mb-4">
          Call the API to register your URL and choose which events you want to receive.
          Save the <code>secret</code> from the response — you will need it to verify signatures.
        </p>
        <DocCodeBlock
          title="Register via API"
          language="js"
          code={`const response = await fetch('https://flash-protocol.vercel.app/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pg_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://yoursite.com/webhooks/flash',
    events: ['payment.completed', 'payment.failed']
  })
});

const { secret } = await response.json();
// Store this as FLASH_WEBHOOK_SECRET in your environment variables
// e.g. whsec_a1b2c3d4e5f6...`}
        />

        <DocNote type="warning">
          <strong>Save your secret now.</strong> It is only returned once. Store it in an environment variable
          like <code className="bg-muted px-1.5 py-0.5 text-xs font-mono mx-1">FLASH_WEBHOOK_SECRET</code> on your server.
        </DocNote>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Step 3: Test it</h3>
        <p className="mb-4">
          Create a payment link and complete a test payment. When the payment finishes, your endpoint
          will receive a <code>payment.completed</code> POST within seconds. You can check delivery
          status in the <strong>Dashboard → Settings → Webhooks</strong> page, or via the API:
        </p>
        <DocCodeBlock
          title="Check deliveries"
          language="js"
          code={`// List your endpoints and see delivery stats
const response = await fetch('https://flash-protocol.vercel.app/api/v1/webhooks', {
  headers: { 'Authorization': 'Bearer pg_live_...' }
});

const { data } = await response.json();
console.log(data[0].recent_deliveries);
// { total: 1, successful: 1, failed: 0 }`}
        />

        <DocNote type="info">
          <strong>Tip:</strong> During development, use a service like <code className="bg-muted px-1.5 py-0.5 text-xs font-mono mx-1">webhook.site</code> or <code className="bg-muted px-1.5 py-0.5 text-xs font-mono mx-1">ngrok</code> to
          expose your local server and inspect incoming webhook payloads.
        </DocNote>
      </DocSection>

      {/* EVENT TYPES */}
      <DocSection title="Event Types">
        <p className="mb-4">
          Subscribe your endpoints to one or more event types. New event types can be added without breaking existing integrations.
        </p>
        <div className="border border-border divide-y divide-border mb-4">
          <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-2 gap-4 font-bold uppercase tracking-wider">
            <div>Event</div>
            <div>Description</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>payment.completed</div>
            <div className="text-muted-foreground">A transaction finished successfully.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>payment.failed</div>
            <div className="text-muted-foreground">A transaction failed or polling timed out.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>link.expired</div>
            <div className="text-muted-foreground">A payment link passed its expiration time.</div>
          </div>
        </div>
      </DocSection>

      {/* REGISTER */}
      <DocSection title="Register an Endpoint">
        <p className="mb-4">
          Register an HTTPS URL to receive webhook deliveries. You can register up to <strong>5 endpoints</strong> per merchant.
          The response includes a <code>secret</code> (prefixed with <code>whsec_</code>) that you must save immediately — it is only shown once.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">POST</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/webhooks</code>
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
            <div>url</div>
            <div className="text-muted-foreground">string</div>
            <div className="font-bold">Yes</div>
            <div className="text-muted-foreground">HTTPS endpoint URL.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
            <div>events</div>
            <div className="text-muted-foreground">string[]</div>
            <div className="font-bold">Yes</div>
            <div className="text-muted-foreground">Event types to subscribe to.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-4 gap-4 hover:bg-muted/10 font-mono">
            <div>description</div>
            <div className="text-muted-foreground">string</div>
            <div className="text-muted-foreground">No</div>
            <div className="text-muted-foreground">Label for this endpoint (max 255 chars).</div>
          </div>
        </div>

        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mt-6 mb-2">Request Example</h3>
        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X POST https://flash-protocol.vercel.app/api/v1/webhooks \\
  -H "Authorization: Bearer pg_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yoursite.com/webhooks/flash",
    "events": ["payment.completed", "payment.failed"],
    "description": "Production webhook"
  }'`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pg_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://yoursite.com/webhooks/flash',
    events: ['payment.completed', 'payment.failed'],
    description: 'Production webhook'
  })
});

const endpoint = await response.json();
// IMPORTANT: Save endpoint.secret now — you won't see it again
console.log(endpoint.secret); // whsec_a1b2c3d4...`,
          }}
        />

        <DocCodeBlock
          title="201 Created"
          code={`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://yoursite.com/webhooks/flash",
  "events": ["payment.completed", "payment.failed"],
  "description": "Production webhook",
  "active": true,
  "created_at": "2026-03-30T12:00:00.000Z",
  "secret": "whsec_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "warning": "Save this secret securely. You won't see it again."
}`}
        />

        <DocNote type="warning">
          <strong>Save your secret immediately.</strong> The <code>whsec_</code> signing secret is only returned once during creation.
          If you lose it, delete the endpoint and create a new one.
        </DocNote>
      </DocSection>

      {/* LIST */}
      <DocSection title="List Endpoints">
        <p className="mb-4">
          Retrieve all webhook endpoints for your merchant account, with delivery statistics.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">GET</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/webhooks</code>
        </div>

        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X GET https://flash-protocol.vercel.app/api/v1/webhooks \\
  -H "Authorization: Bearer pg_live_..."`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/webhooks', {
  headers: { 'Authorization': 'Bearer pg_live_...' }
});

const { data } = await response.json();`,
          }}
        />

        <DocCodeBlock
          title="200 OK"
          code={`{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://yoursite.com/webhooks/flash",
      "events": ["payment.completed", "payment.failed"],
      "description": "Production webhook",
      "active": true,
      "created_at": "2026-03-30T12:00:00.000Z",
      "recent_deliveries": {
        "total": 142,
        "successful": 138,
        "failed": 4
      }
    }
  ]
}`}
        />
      </DocSection>

      {/* GET SINGLE */}
      <DocSection title="Get Endpoint Details">
        <p className="mb-4">
          Retrieve details for a single endpoint, including its 20 most recent delivery attempts.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">GET</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/webhooks/:id</code>
        </div>

        <DocCodeBlock
          title="200 OK"
          code={`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://yoursite.com/webhooks/flash",
  "events": ["payment.completed", "payment.failed"],
  "active": true,
  "deliveries": [
    {
      "id": "delivery-uuid",
      "event_type": "payment.completed",
      "response_status": 200,
      "delivered": true,
      "duration_ms": 120,
      "attempt": 1,
      "created_at": "2026-03-30T12:01:00.000Z"
    },
    {
      "id": "delivery-uuid-2",
      "event_type": "payment.failed",
      "response_status": 500,
      "error_message": null,
      "delivered": false,
      "duration_ms": 340,
      "attempt": 1,
      "created_at": "2026-03-30T11:55:00.000Z"
    }
  ]
}`}
        />
      </DocSection>

      {/* UPDATE */}
      <DocSection title="Update Endpoint">
        <p className="mb-4">
          Update the URL, subscribed events, description, or active status. All fields are optional.
          You cannot change the signing secret — delete and recreate the endpoint instead.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">PATCH</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/webhooks/:id</code>
        </div>

        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X PATCH https://flash-protocol.vercel.app/api/v1/webhooks/550e8400... \\
  -H "Authorization: Bearer pg_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "events": ["payment.completed"],
    "active": false
  }'`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/webhooks/550e8400...', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer pg_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    events: ['payment.completed'],
    active: false
  })
});

const endpoint = await response.json();`,
          }}
        />
      </DocSection>

      {/* DELETE */}
      <DocSection title="Delete Endpoint">
        <p className="mb-4">
          Permanently delete a webhook endpoint. Delivery logs are retained for 30 days.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">DELETE</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/webhooks/:id</code>
        </div>

        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X DELETE https://flash-protocol.vercel.app/api/v1/webhooks/550e8400... \\
  -H "Authorization: Bearer pg_live_..."`,
            js: `await fetch('https://flash-protocol.vercel.app/api/v1/webhooks/550e8400...', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer pg_live_...' }
});`,
          }}
        />
      </DocSection>

      {/* REPLAY */}
      <DocSection title="Replay a Delivery">
        <p className="mb-4">
          Re-send a specific failed delivery with the original payload. A new delivery log entry is created.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-foreground text-background px-2 py-1 text-[10px] font-bold font-mono tracking-widest">POST</span>
          <code className="bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">/api/v1/webhooks/:id/replay</code>
        </div>

        <MultiLangCodeBlock
          snippets={{
            bash: `curl -X POST https://flash-protocol.vercel.app/api/v1/webhooks/550e8400.../replay \\
  -H "Authorization: Bearer pg_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "delivery_id": "delivery-uuid" }'`,
            js: `const response = await fetch('https://flash-protocol.vercel.app/api/v1/webhooks/550e8400.../replay', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pg_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ delivery_id: 'delivery-uuid' })
});

const { success, delivery } = await response.json();`,
          }}
        />
      </DocSection>

      {/* PAYLOAD FORMAT */}
      <DocSection title="Payload Format">
        <p className="mb-4">
          Every webhook delivery POSTs a JSON body with this structure:
        </p>
        <DocCodeBlock
          title="payment.completed"
          code={`{
  "id": "evt_a1b2c3d4e5f6a7b8c9d0e1f2",
  "type": "payment.completed",
  "created_at": "2026-03-30T12:00:00.000Z",
  "data": {
    "transaction_id": "tx-uuid",
    "payment_link_id": "pl-uuid",
    "status": "completed",
    "customer_wallet": "0xabc...",
    "from_chain_id": "137",
    "from_token_symbol": "USDC",
    "from_amount": "50.00",
    "to_chain_id": "1",
    "to_token_symbol": "ETH",
    "to_amount": "0.025",
    "provider": "lifi",
    "source_tx_hash": "0x...",
    "dest_tx_hash": "0x...",
    "completed_at": "2026-03-30T12:00:00.000Z"
  }
}`}
        />

        <p className="mb-4">
          For <code>payment.failed</code> events, the <code>data</code> object also includes:
        </p>
        <DocCodeBlock
          title="Additional fields for payment.failed"
          code={`{
  "error_message": "Polling timeout: max retries reached",
  "failure_stage": "bridge"
}`}
        />
      </DocSection>

      {/* HEADERS */}
      <DocSection title="Delivery Headers">
        <p className="mb-4">
          Every webhook POST includes these headers for verification and tracing:
        </p>
        <div className="border border-border divide-y divide-border mb-4">
          <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-2 gap-4 font-bold uppercase tracking-wider">
            <div>Header</div>
            <div>Description</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>X-Flash-Signature</div>
            <div className="text-muted-foreground">HMAC-SHA256 signature: <code>sha256=&lt;hex&gt;</code></div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>X-Flash-Event</div>
            <div className="text-muted-foreground">Event type (e.g. <code>payment.completed</code>)</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>X-Flash-Delivery-Id</div>
            <div className="text-muted-foreground">Unique ID for this delivery attempt.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>X-Flash-Timestamp</div>
            <div className="text-muted-foreground">Unix timestamp (for replay protection).</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>Content-Type</div>
            <div className="text-muted-foreground">application/json</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>User-Agent</div>
            <div className="text-muted-foreground">FlashProtocol-Webhook/1.0</div>
          </div>
        </div>
      </DocSection>

      {/* SIGNATURE VERIFICATION */}
      <DocSection title="Verifying Signatures">
        <p className="mb-4">
          Always verify the <code>X-Flash-Signature</code> header to ensure the payload was sent by Flash Protocol
          and has not been tampered with. The HMAC key is the hex portion of your secret — <strong>strip the <code>whsec_</code> prefix</strong> before using it.
        </p>

        <MultiLangCodeBlock
          snippets={{
            js: `import crypto from 'crypto';

function verifyWebhook(rawBody, signature, secret) {
  // Strip the whsec_ prefix before using as HMAC key
  const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', rawSecret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express example
app.post('/webhooks/flash', (req, res) => {
  const signature = req.headers['x-flash-signature'];
  const isValid = verifyWebhook(req.rawBody, signature, process.env.FLASH_WEBHOOK_SECRET);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  switch (event.type) {
    case 'payment.completed':
      // Fulfill the order
      fulfillOrder(event.data.payment_link_id, event.data.transaction_id);
      break;
    case 'payment.failed':
      // Handle failure
      markOrderFailed(event.data.payment_link_id, event.data.error_message);
      break;
  }

  res.status(200).send('OK');
});`,
            bash: `# Verify signature with openssl
SECRET="a1b2c3d4..."  # hex part only, without whsec_ prefix
BODY='{"id":"evt_...","type":"payment.completed",...}'

EXPECTED=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
echo "sha256=$EXPECTED"

# Compare with X-Flash-Signature header value`,
          }}
        />

        <DocNote type="warning">
          <strong>Replay protection:</strong> Check the <code>X-Flash-Timestamp</code> header and reject payloads older than 5 minutes
          to prevent replay attacks.
        </DocNote>
      </DocSection>

      {/* RETRIES */}
      <DocSection title="Retries & Delivery">
        <p className="mb-4">
          If your endpoint returns a non-2xx status code, times out (5-second limit), or is unreachable, Flash Protocol
          retries the delivery automatically with exponential backoff:
        </p>
        <div className="border border-border divide-y divide-border mb-4">
          <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-2 gap-4 font-bold uppercase tracking-wider">
            <div>Attempt</div>
            <div>Approximate Delay</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>1 (initial)</div>
            <div className="text-muted-foreground">Immediate</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>2</div>
            <div className="text-muted-foreground">~30 seconds</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>3</div>
            <div className="text-muted-foreground">~2 minutes</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>4</div>
            <div className="text-muted-foreground">~8 minutes</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>5</div>
            <div className="text-muted-foreground">~30 minutes</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>6</div>
            <div className="text-muted-foreground">~2 hours</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>7</div>
            <div className="text-muted-foreground">~8 hours</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>8</div>
            <div className="text-muted-foreground">~24 hours</div>
          </div>
        </div>

        <p>
          After all retries are exhausted, the delivery is marked as failed. You can manually replay failed
          deliveries via the API or the Dashboard.
        </p>
      </DocSection>

      {/* LIMITS */}
      <DocSection title="Limits">
        <div className="border border-border divide-y divide-border">
          <div className="p-3 bg-muted/30 font-mono text-xs grid grid-cols-2 gap-4 font-bold uppercase tracking-wider">
            <div>Setting</div>
            <div>Value</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>Max endpoints per merchant</div>
            <div className="text-muted-foreground">5</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>Delivery timeout</div>
            <div className="text-muted-foreground">5 seconds</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>Max retries</div>
            <div className="text-muted-foreground">8 (exponential backoff)</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>Delivery log retention</div>
            <div className="text-muted-foreground">30 days</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-2 gap-4 hover:bg-muted/10 font-mono">
            <div>URL protocol</div>
            <div className="text-muted-foreground">HTTPS only</div>
          </div>
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
            <div>400</div>
            <div>Validation Error</div>
            <div className="text-muted-foreground">Invalid URL, missing events, or limit exceeded.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>401</div>
            <div>Unauthorized</div>
            <div className="text-muted-foreground">Invalid or missing API key.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>404</div>
            <div>Not Found</div>
            <div className="text-muted-foreground">Endpoint or delivery ID not found.</div>
          </div>
          <div className="p-3 text-xs grid grid-cols-3 gap-4 hover:bg-muted/10 font-mono">
            <div>409</div>
            <div>Conflict</div>
            <div className="text-muted-foreground">Endpoint with this URL already exists.</div>
          </div>
        </div>
      </DocSection>
    </div>
  )
}
