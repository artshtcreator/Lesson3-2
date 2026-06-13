import { useEffect } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'

export const AuthBootstrap = (): null => {
  const { initializeAuth } = useAuth()

  useEffect(() => {
    let unsubscribe = (): void => undefined

    const init = async (): Promise<void> => {
      unsubscribe = await initializeAuth()
    }

    void init()

    return () => {
      unsubscribe()
    }
  }, [initializeAuth])

  return null
}
