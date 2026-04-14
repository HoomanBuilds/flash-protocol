import { createBrowserClient, createServerClient as createSupabaseSSRClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { cookies } from 'next/headers'

// Client-side (Browser)
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// Server-side (SSR with cookies)
export const createSSRClient = async () => {
  const cookieStore = await cookies()
  return createSupabaseSSRClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try { cookieStore.set({ name, value, ...options }) } catch (error) {}
        },
        remove(name: string, options: any) {
          try { cookieStore.delete({ name, ...options }) } catch (error) {}
        },
      },
    }
  )
}

// Server-side (API Routes, Services, Background Jobs)
export const createServerClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as SupabaseClient<Database>

export const createAdminClient = createServerClient
