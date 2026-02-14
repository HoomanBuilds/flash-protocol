import { useEffect, useState } from 'react'

export function useSession() {
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  useEffect(() => {
    // Basic cookie parser
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
    }
    
    const token = getCookie('session_id')
    if (token) setSessionToken(token)
  }, [])

  return { sessionToken }
}
