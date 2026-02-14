'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ApiKeySection from '@/components/dashboard/settings/ApiKeySection'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and API integrations.
        </p>
      </div>
      
      <Separator className="my-6" />
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Developer Settings</CardTitle>
            <CardDescription>
              Configure API keys to integrate payment links programmatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Merchant ID is fetched via session internally inside the component or context, 
                for now we pass a placeholder or let internal logic handle it. 
                ApiKeySection handles its own auth via useSession hook we created. */}
            <ApiKeySection merchantId="" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
