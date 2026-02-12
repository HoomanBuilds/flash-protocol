import { createServerClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Merchant = Database['public']['Tables']['merchants']['Row']

export const UserService = {
  findUserByWallet: async (walletAddress: string): Promise<Merchant | null> => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error) return null 
    return data
  },

  createUser: async (walletAddress: string): Promise<Merchant | null> => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('merchants')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ wallet_address: walletAddress } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return null
    }
    return data
  },

  upsertUser: async (walletAddress: string): Promise<Merchant | null> => {
    const existing = await UserService.findUserByWallet(walletAddress)
    if (existing) return existing
    return await UserService.createUser(walletAddress)
  }
}
