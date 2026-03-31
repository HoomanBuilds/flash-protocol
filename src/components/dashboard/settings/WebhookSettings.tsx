'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Copy,
  Webhook,
  Trash2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
  Pencil,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAppKitAccount } from '@reown/appkit/react'

const EVENT_OPTIONS = [
  { value: 'payment.completed', label: 'payment.completed', description: 'When a payment succeeds' },
  { value: 'payment.failed', label: 'payment.failed', description: 'When a payment fails' },
  { value: 'link.expired', label: 'link.expired', description: 'When a payment link expires' },
]

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  description: string | null
  active: boolean
  created_at: string
  updated_at: string
  recent_deliveries: {
    total: number
    successful: number
    failed: number
  }
}

interface DeliveryLog {
  id: string
  event_type: string
  response_status: number | null
  error_message: string | null
  delivered: boolean
  duration_ms: number | null
  attempt: number
  created_at: string
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function WebhookSettings() {
  const { toast } = useToast()
  const { address } = useAppKitAccount()
  const walletHeaders: Record<string, string> = address
    ? { 'x-wallet-address': address }
    : {}

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Add form state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newEvents, setNewEvents] = useState<string[]>(['payment.completed', 'payment.failed'])

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(null)

  // Delivery log state
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [logEndpoint, setLogEndpoint] = useState<WebhookEndpoint | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([])
  const [logLoading, setLogLoading] = useState(false)

  const fetchEndpoints = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/webhooks', { headers: walletHeaders })
      const data = await response.json()
      setEndpoints(data.data || [])
    } catch {
      console.error('Failed to fetch webhook endpoints')
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchEndpoints()
  }, [fetchEndpoints])

  async function createEndpoint() {
    if (!newUrl.trim()) {
      toast({ title: 'URL required', variant: 'destructive' })
      return
    }
    if (newEvents.length === 0) {
      toast({ title: 'Select at least one event', variant: 'destructive' })
      return
    }

    setActionLoading(true)
    setNewSecret(null)

    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...walletHeaders },
        body: JSON.stringify({
          url: newUrl.trim(),
          events: newEvents,
          description: newDescription.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create endpoint')
      }

      setNewSecret(data.secret)
      setNewUrl('')
      setNewDescription('')
      setNewEvents(['payment.completed', 'payment.failed'])
      setAddDialogOpen(false)
      fetchEndpoints()

      toast({ title: 'Webhook endpoint created' })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create endpoint',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function deleteEndpoint() {
    if (!deleteTarget) return
    setActionLoading(true)

    try {
      const response = await fetch(`/api/webhooks/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: walletHeaders,
      })

      if (!response.ok) throw new Error('Failed to delete')

      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      fetchEndpoints()
      toast({ title: 'Endpoint deleted' })
    } catch {
      toast({ title: 'Error', description: 'Failed to delete endpoint', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  async function toggleEndpoint(ep: WebhookEndpoint) {
    try {
      const response = await fetch(`/api/webhooks/${ep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...walletHeaders },
        body: JSON.stringify({ active: !ep.active }),
      })

      if (!response.ok) throw new Error('Failed to update')
      fetchEndpoints()
    } catch {
      toast({ title: 'Error', description: 'Failed to update endpoint', variant: 'destructive' })
    }
  }

  async function viewDeliveries(ep: WebhookEndpoint) {
    setLogEndpoint(ep)
    setLogDialogOpen(true)
    setLogLoading(true)

    try {
      const response = await fetch(`/api/webhooks/${ep.id}`, { headers: walletHeaders })
      const data = await response.json()
      setDeliveries(data.deliveries || [])
    } catch {
      console.error('Failed to fetch deliveries')
    } finally {
      setLogLoading(false)
    }
  }

  async function replayDelivery(endpointId: string, deliveryId: string) {
    try {
      const response = await fetch(`/api/webhooks/${endpointId}/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...walletHeaders },
        body: JSON.stringify({ delivery_id: deliveryId }),
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: 'Replay successful' })
      } else {
        toast({ title: 'Replay failed', description: 'Delivery was not successful', variant: 'destructive' })
      }

      // Refresh deliveries
      if (logEndpoint) viewDeliveries(logEndpoint)
    } catch {
      toast({ title: 'Error', description: 'Failed to replay delivery', variant: 'destructive' })
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Webhooks</h3>
        </div>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary" />
            Webhooks
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Receive real-time notifications when payment events occur.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
          + ADD_ENDPOINT
        </Button>
      </div>

      {/* Secret display (shown once after creation) */}
      {newSecret && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400">
          <Webhook className="h-4 w-4" />
          <AlertTitle>Webhook Secret Created</AlertTitle>
          <AlertDescription>
            <p className="text-sm mb-3 mt-1 opacity-90">
              Save this secret securely now. You won&apos;t be able to see it again!
            </p>
            <div className="flex items-center gap-2 mb-2">
              <code className="flex-1 p-3 bg-background border border-border rounded-md font-mono text-sm tracking-wide text-foreground break-all shadow-sm">
                {newSecret}
              </code>
              <Button
                size="sm"
                variant="secondary"
                className="bg-background border border-border hover:bg-muted"
                onClick={() => handleCopy(newSecret)}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-2">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Endpoints list */}
      {endpoints.length === 0 ? (
        <div className="p-8 border border-dashed border-border rounded-lg text-center text-muted-foreground">
          <Webhook className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No webhook endpoints configured.</p>
          <p className="text-xs mt-1">Add an endpoint to start receiving payment notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <div key={ep.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono truncate">{ep.url}</code>
                    <Badge
                      className={
                        ep.active
                          ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/20'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted'
                      }
                    >
                      {ep.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {ep.description && (
                    <p className="text-xs text-muted-foreground">{ep.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {ep.events.map((evt) => (
                      <Badge key={evt} variant="outline" className="text-xs font-mono">
                        {evt}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                    Deliveries
                  </span>
                  <p className="mt-0.5">{ep.recent_deliveries.total}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                    Success Rate
                  </span>
                  <p className="mt-0.5">
                    {ep.recent_deliveries.total > 0
                      ? `${Math.round((ep.recent_deliveries.successful / ep.recent_deliveries.total) * 100)}%`
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                    Created
                  </span>
                  <p className="mt-0.5">{formatRelativeDate(ep.created_at)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => viewDeliveries(ep)}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  VIEW_LOGS
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleEndpoint(ep)}>
                  <Pencil className="w-3 h-3 mr-1" />
                  {ep.active ? 'DISABLE' : 'ENABLE'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeleteTarget(ep)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  DELETE
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add endpoint dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">[ NEW_WEBHOOK_ENDPOINT ]</DialogTitle>
            <DialogDescription>
              Register an HTTPS endpoint to receive payment event notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium font-mono uppercase tracking-wider">
                Endpoint URL
              </label>
              <Input
                placeholder="https://yoursite.com/webhooks/flash"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium font-mono uppercase tracking-wider">
                Description
              </label>
              <Input
                placeholder="e.g. Production webhook"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium font-mono uppercase tracking-wider">
                Events
              </label>
              <div className="space-y-2">
                {EVENT_OPTIONS.map((evt) => (
                  <div key={evt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={evt.value}
                      checked={newEvents.includes(evt.value)}
                      onCheckedChange={(checked: boolean | 'indeterminate') => {
                        if (checked) {
                          setNewEvents([...newEvents, evt.value])
                        } else {
                          setNewEvents(newEvents.filter((e) => e !== evt.value))
                        }
                      }}
                    />
                    <label htmlFor={evt.value} className="text-sm cursor-pointer">
                      <span className="font-mono">{evt.label}</span>
                      <span className="text-muted-foreground ml-2">— {evt.description}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={createEndpoint} disabled={actionLoading || !newUrl.trim() || newEvents.length === 0}>
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                '[ CREATE_ENDPOINT ]'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook Endpoint</DialogTitle>
            <DialogDescription>
              This will permanently delete the endpoint{' '}
              <code className="font-mono text-foreground">{deleteTarget?.url}</code> and all its
              delivery logs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteEndpoint} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Endpoint'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery log dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">[ DELIVERY_LOG ]</DialogTitle>
            <DialogDescription>
              Recent deliveries to{' '}
              <code className="font-mono text-foreground">{logEndpoint?.url}</code>
            </DialogDescription>
          </DialogHeader>

          {logLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No deliveries yet.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {deliveries.map((dl) => (
                <div
                  key={dl.id}
                  className="flex items-center justify-between p-3 border border-border rounded-md text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {dl.delivered ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{dl.event_type}</span>
                        <Badge
                          variant="outline"
                          className={
                            dl.delivered
                              ? 'text-green-600 border-green-500/30'
                              : 'text-red-600 border-red-500/30'
                          }
                        >
                          {dl.response_status || 'ERR'}
                        </Badge>
                        {dl.duration_ms && (
                          <span className="text-xs text-muted-foreground">{dl.duration_ms}ms</span>
                        )}
                      </div>
                      {dl.error_message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {dl.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(dl.created_at)}
                    </span>
                    {!dl.delivered && logEndpoint && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => replayDelivery(logEndpoint.id, dl.id)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        REPLAY
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
