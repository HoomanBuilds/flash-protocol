'use client'

import { useEffect, useState } from 'react'
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
import {
  Copy,
  Eye,
  EyeOff,
  Key,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface KeyMetadata {
  name: string | null
  prefix: string
  created_at: string
  last_used_at: string | null
  total_calls: number
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
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

function maskPrefix(prefix: string): string {
  return prefix + '••••'
}

export default function ApiKeySection({ merchantId: _merchantId }: { merchantId: string }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [keyMetadata, setKeyMetadata] = useState<KeyMetadata | null>(null)
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)

  useEffect(() => {
    fetchKeyStatus()
  }, [])

  async function fetchKeyStatus() {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/auth/api-keys', {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.active) {
        setKeyMetadata({
          name: data.name,
          prefix: data.prefix,
          created_at: data.created_at,
          last_used_at: data.last_used_at,
          total_calls: data.total_calls,
        })
      } else {
        setKeyMetadata(null)
      }
    } catch {
      console.error('Failed to fetch API key status')
    } finally {
      setLoading(false)
    }
  }

  async function generateApiKey() {
    if (!keyName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your API key.',
        variant: 'destructive',
      })
      return
    }

    setActionLoading(true)
    setRawKey(null)

    try {
      const response = await fetch('/api/v1/auth/api-keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate key')
      }

      setRawKey(data.api_key)
      setKeyMetadata({
        name: data.name,
        prefix: data.prefix,
        created_at: data.created_at,
        last_used_at: null,
        total_calls: 0,
      })
      setKeyName('')
    } catch (error) {
      console.error('Failed to generate API key:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate API Key',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function revokeApiKey() {
    setActionLoading(true)
    try {
      const response = await fetch('/api/v1/auth/api-keys', {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to revoke')

      setKeyMetadata(null)
      setRawKey(null)
      setRevokeDialogOpen(false)
      toast({ title: 'Revoked', description: 'API key revoked successfully' })
    } catch (e) {
      console.error(e)
      toast({
        title: 'Error',
        description: 'Failed to revoke key',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopy = () => {
    if (rawKey) {
      navigator.clipboard.writeText(rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // State A: Loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">API Access</h3>
        </div>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // State B: No active key
  if (!keyMetadata) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            API Access
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Generate an API key for programmatic access to the Payment Gateway.
          </p>
        </div>

        <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="key-name"
              className="text-sm font-medium font-mono uppercase tracking-wider"
            >
              Key Name
            </label>
            <Input
              id="key-name"
              placeholder="e.g. Production Backend"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              maxLength={100}
              onKeyDown={(e) => {
                if (e.key === 'Enter') generateApiKey()
              }}
            />
          </div>

          <Button
            onClick={generateApiKey}
            disabled={actionLoading || !keyName.trim()}
            variant="outline"
            className="w-full"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'GENERATE_API_KEY'
            )}
          </Button>
        </div>

        <div className="pt-4 border-t flex gap-4 text-sm text-blue-600">
          <a href="/docs" className="hover:underline flex items-center gap-1">
            View API Documentation &rarr;
          </a>
        </div>
      </div>
    )
  }

  // State C: Active key exists
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            API Access
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your programmatic access keys for the Payment Gateway.
          </p>
        </div>
      </div>

      {/* C1: Just generated — show raw key */}
      {rawKey && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400">
          <Key className="h-4 w-4" />
          <AlertTitle>New API Key Generated</AlertTitle>
          <AlertDescription>
            <p className="text-sm mb-3 mt-1 opacity-90">
              Save this key securely now. You won&apos;t be able to see it again!
            </p>

            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 p-3 bg-background border border-border rounded-md font-mono text-sm tracking-wide text-foreground break-all shadow-sm">
                {showKey ? rawKey : '••••••••••••••••••••••••••••••••'}
              </code>

              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-green-500/20"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="secondary"
                className="bg-background border border-border hover:bg-muted"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="ml-2">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key metadata card */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold font-mono">
              {keyMetadata.name || 'Untitled Key'}
            </span>
            <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/20">
              Active
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
              Prefix
            </span>
            <p className="font-mono mt-0.5">{maskPrefix(keyMetadata.prefix)}</p>
          </div>
          <div>
            <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
              Created
            </span>
            <p className="mt-0.5">{formatRelativeDate(keyMetadata.created_at)}</p>
          </div>
          <div>
            <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
              Last Used
            </span>
            <p className="mt-0.5">
              {keyMetadata.last_used_at
                ? formatRelativeDate(keyMetadata.last_used_at)
                : 'Never used'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
              Total Calls
            </span>
            <p className="mt-0.5">{keyMetadata.total_calls.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setRevokeDialogOpen(true)}
            className="opacity-90 hover:opacity-100"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Revoke Key
          </Button>
        </div>
      </div>

      {/* Revoke confirmation dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              This will permanently revoke{' '}
              <span className="font-semibold text-foreground">
                {keyMetadata.name || 'Untitled Key'}
              </span>
              . Any applications using this key will lose access immediately. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={revokeApiKey}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pt-4 border-t flex gap-4 text-sm text-blue-600">
        <a href="/docs/api" className="hover:underline flex items-center gap-1">
          View API Documentation &rarr;
        </a>
      </div>
    </div>
  )
}
