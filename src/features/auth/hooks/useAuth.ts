import { useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useUserStore } from '@/store/useUserStore'

interface SignInPayload {
  email: string
  password: string
}

interface SignUpPayload {
  email: string
  password: string
}

interface SignUpResult {
  requiresEmailConfirmation: boolean
}

interface UseAuthResult {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
  session: Session | null
  errorMessage: string | null
  initialized: boolean
  initializeAuth: () => Promise<() => void>
  signIn: (payload: SignInPayload) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (payload: SignUpPayload) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

export const useAuth = (): UseAuthResult => {
  const status = useUserStore((state) => state.status)
  const session = useUserStore((state) => state.session)
  const errorMessage = useUserStore((state) => state.errorMessage)
  const initialized = useUserStore((state) => state.initialized)
  const setStatus = useUserStore((state) => state.setStatus)
  const setSession = useUserStore((state) => state.setSession)
  const setErrorMessage = useUserStore((state) => state.setErrorMessage)
  const setInitialized = useUserStore((state) => state.setInitialized)

  const initializeAuth = useCallback(async (): Promise<() => void> => {
    if (initialized) {
      return () => undefined
    }

    if (!isSupabaseConfigured) {
      setStatus('error')
      setErrorMessage('Supabase is not configured. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      setInitialized(true)
      return () => undefined
    }

    setStatus('loading')

    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
      } else {
        setSession(data.session)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected auth initialization error.'
      setStatus('error')
      setErrorMessage(message)
    } finally {
      setInitialized(true)
    }

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      authSubscription.subscription.unsubscribe()
    }
  }, [initialized, setErrorMessage, setInitialized, setSession, setStatus])

  const signIn = useCallback(
    async ({ email, password }: SignInPayload): Promise<void> => {
      if (!isSupabaseConfigured) {
        const message = 'Supabase is not configured. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
        setStatus('error')
        setErrorMessage(message)
        throw new Error(message)
      }

      setStatus('loading')
      setErrorMessage(null)

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
        throw new Error(error.message)
      }

      setSession(data.session)
    },
    [setErrorMessage, setSession, setStatus],
  )

  const signUp = useCallback(
    async ({ email, password }: SignUpPayload): Promise<SignUpResult> => {
      if (!isSupabaseConfigured) {
        const message = 'Supabase is not configured. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
        setStatus('error')
        setErrorMessage(message)
        throw new Error(message)
      }

      setStatus('loading')
      setErrorMessage(null)

      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
        throw new Error(error.message)
      }

      setSession(data.session ?? null)
      return { requiresEmailConfirmation: data.session === null }
    },
    [setErrorMessage, setSession, setStatus],
  )

  const signOut = useCallback(async (): Promise<void> => {
    setStatus('loading')
    const { error } = await supabase.auth.signOut()

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      throw new Error(error.message)
    }

    setSession(null)
  }, [setErrorMessage, setSession, setStatus])

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured) {
      const message = 'Supabase is not configured. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      setStatus('error')
      setErrorMessage(message)
      throw new Error(message)
    }

    setStatus('loading')
    setErrorMessage(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      throw new Error(error.message)
    }
  }, [setErrorMessage, setStatus])

  return {
    status,
    session,
    errorMessage,
    initialized,
    initializeAuth,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
  }
}
