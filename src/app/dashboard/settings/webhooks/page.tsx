'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import WebhookSettings from '@/components/dashboard/settings/WebhookSettings'

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Webhooks</h2>
        <p className="text-muted-foreground">
          Manage webhook endpoints for real-time payment event notifications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
          <CardDescription>
            Register HTTPS endpoints to receive signed JSON payloads when payments complete or fail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookSettings />
        </CardContent>
      </Card>
    </div>
  )
}
