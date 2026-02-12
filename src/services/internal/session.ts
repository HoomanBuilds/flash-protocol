import { createServerClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { addDays } from 'date-fns' 

// Helper to add days removed in favor of date-fns
// function addDaysNative(date: Date, days: number) { ... }

type Session = Database['public']['Tables']['sessions']['Row']

export const SessionService = {
  createSession: async (
    walletAddress: string,
    nonce: string,
    signature: string,
    message: string
  ): Promise<Session | null> => {
    const supabase = createServerClient()
    const expiresAt = addDays(new Date(), 1).toISOString() // 24 hour expiry

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        wallet_address: walletAddress,
        nonce,
        signature,
        message,
        expires_at: expiresAt
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return null
    }
    return data
  },

  verifySession: async (sessionId: string): Promise<boolean> => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) return false
    return true
  }
}
