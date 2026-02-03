import { create } from 'zustand'
import { Database } from '@/types/database.types'

type Merchant = Database['public']['Tables']['merchants']['Row']

interface UserState {
  user: Merchant | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  fetchUser: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: Merchant | null) => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  fetchUser: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      
      if (data.authenticated && data.user) {
        set({ user: data.user, isAuthenticated: true })
      } else {
        set({ user: null, isAuthenticated: false })
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      set({ user: null, isAuthenticated: false })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}))
