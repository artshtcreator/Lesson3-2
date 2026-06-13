import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'

interface UserStoreState {
  status: AuthStatus
  session: Session | null
  errorMessage: string | null
  initialized: boolean
  setStatus: (status: AuthStatus) => void
  setSession: (session: Session | null) => void
  setErrorMessage: (message: string | null) => void
  setInitialized: (initialized: boolean) => void
}

export const useUserStore = create<UserStoreState>((set) => ({
  status: 'idle',
  session: null,
  errorMessage: null,
  initialized: false,
  setStatus: (status: AuthStatus): void => set({ status }),
  setSession: (session: Session | null): void =>
    set({
      session,
      status: session ? 'authenticated' : 'unauthenticated',
      errorMessage: null,
    }),
  setErrorMessage: (errorMessage: string | null): void => set({ errorMessage }),
  setInitialized: (initialized: boolean): void => set({ initialized }),
}))
