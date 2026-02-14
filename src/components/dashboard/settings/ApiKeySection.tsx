'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Copy, Eye, EyeOff, Key, Trash2, CheckCircle2 } from 'lucide-react'
import { useSession } from '@/lib/hooks/use-session'

export default function ApiKeySection({ merchantId }: { merchantId: string }) {
  const { sessionToken } = useSession()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateApiKey() {
    if (!confirm('Generate a new API key? This will revoke any existing key.')) return
    
    setLoading(true)
    setApiKey(null)
    
    try {
      const response = await fetch('/api/v1/auth/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}` // From SIWE session hook
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate key')
      }
      
      setApiKey(data.api_key)
    } catch (error) {
      console.error('Failed to generate API key:', error)
      alert('Failed to generate API Key')
    } finally {
      setLoading(false)
    }
  }

  async function revokeApiKey() {
    if (!confirm('Are you sure you want to revoke your API key? API integrations will stop working immediately.')) return

    setLoading(true)
    try {
      const response = await fetch('/api/v1/auth/api-keys', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${sessionToken}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to revoke')
      
      setApiKey(null)
      alert('API Key revoked successfully')
    } catch (e) {
        console.error(e)
        alert('Failed to revoke key')
    } finally {
        setLoading(false)
    }
  }

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API Access
            </h3>
            <p className="text-sm text-gray-500 mt-1">
                Manage your programmatic access keys for the Payment Gateway.
            </p>
        </div>
        
        {!apiKey && (
            <Button onClick={generateApiKey} disabled={loading} variant="outline">
                {loading ? 'Generating...' : 'Generate API Key'}
            </Button>
        )}
      </div>

      {!apiKey && (
          <div className="p-4 border border-border rounded-lg bg-muted/50 flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            No active API key generated in this session. Existing keys are hidden for security.
          </div>
      )}
      
      {apiKey && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400">
          <Key className="h-4 w-4" />
          <AlertTitle>New API Key Generated</AlertTitle>
          <AlertDescription>
            <p className="text-sm mb-3 mt-1 opacity-90">
                Save this key securely now. You won't be able to see it again!
            </p>
            
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 p-3 bg-background border border-border rounded-md font-mono text-sm tracking-wide text-foreground break-all shadow-sm">
                {showKey ? apiKey : '••••••••••••••••••••••••••••••••'}
              </code>
              
              <Button 
                size="sm" 
                variant="ghost"
                className="hover:bg-green-500/20"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              
              <Button 
                size="sm"
                variant="secondary"
                className="bg-background border border-border hover:bg-muted"
                onClick={handleCopy}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-2">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>

            <div className="flex justify-end">
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={revokeApiKey}
                    className="opacity-90 hover:opacity-100"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke Key
                </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Helper Links */}
      <div className="pt-4 border-t flex gap-4 text-sm text-blue-600">
        <a href="/docs/api" className="hover:underline flex items-center gap-1">
            View API Documentation &rarr;
        </a>
      </div>
    </div>
  )
}
