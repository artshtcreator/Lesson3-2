import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/hooks/useAuth'

type RegisterFormState = {
  email: string
  password: string
  confirmPassword: string
  role: string
}

const IT_TEAM_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'QA Engineer',
  'DevOps Engineer',
  'UI/UX Designer',
  'Product Manager',
] as const

export const RegisterPage = (): JSX.Element => {
  const navigate = useNavigate()
  const { signUp, signInWithGoogle, status, errorMessage } = useAuth()
  const [formState, setFormState] = useState<RegisterFormState>({
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  })

  const handleFieldChange =
    (field: keyof RegisterFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      setFormState((previous) => ({ ...previous, [field]: event.target.value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (formState.password !== formState.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    try {
      const signUpResult = await signUp({ email: formState.email, password: formState.password, role: formState.role })

      if (signUpResult.requiresEmailConfirmation) {
        toast.success('Registration successful. Check your email to confirm your account.')
        navigate('/login', { replace: true })
        return
      }

      toast.success('Registration successful. You are now signed in.')
      navigate('/', { replace: true })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.'
      toast.error(message)
    }
  }

  const handleGoogleSignUp = async (): Promise<void> => {
    try {
      await signInWithGoogle()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google registration failed. Please try again.'
      toast.error(message)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4 dark:bg-surface-900">
      <section className="w-full max-w-md rounded-modal border border-surface-100 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-800">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-50">Create account</h1>
        <p className="mt-2 text-sm text-surface-800 dark:text-surface-100">
          Register with email and password to start using AI Task Board.
        </p>
        <p className="mt-1 text-sm text-surface-800 dark:text-surface-100">
          Already have an account?{' '}
          <Link className="font-medium text-brand-600 hover:underline" to="/login">
            Sign in
          </Link>
          .
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            id="register-email"
            type="email"
            label="Email"
            placeholder="name@example.com"
            value={formState.email}
            onChange={handleFieldChange('email')}
            required
          />
          <Input
            id="register-password"
            type="password"
            label="Password"
            placeholder="********"
            value={formState.password}
            onChange={handleFieldChange('password')}
            required
          />
          <Input
            id="register-confirm-password"
            type="password"
            label="Confirm password"
            placeholder="********"
            value={formState.confirmPassword}
            onChange={handleFieldChange('confirmPassword')}
            required
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-surface-900 dark:text-surface-50">Role</span>
            <select
              id="register-role"
              value={formState.role}
              onChange={handleFieldChange('role')}
              required
              className="w-full rounded-card border border-surface-100 bg-white px-3 py-2 text-surface-900 outline-none transition focus:border-brand-500 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-50"
            >
              <option value="" disabled>
                Select your role
              </option>
              {IT_TEAM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          {errorMessage ? <p className="text-sm text-danger-500">{errorMessage}</p> : null}

          <Button type="submit" className="w-full" isLoading={status === 'loading'}>
            Register
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full gap-2 border border-surface-200 dark:border-surface-700"
            isLoading={status === 'loading'}
            onClick={handleGoogleSignUp}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.5l2.7-2.6C17 3.3 14.7 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.8S6.8 21.2 12 21.2c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12z"
              />
              <path
                fill="#34A853"
                d="M3.7 7.3l3.2 2.4c.9-2.6 3.3-4.4 6-4.4 1.9 0 3.2.8 4 1.5l2.7-2.6C17 3.3 14.7 2.4 12 2.4 8.4 2.4 5.2 4.5 3.7 7.3z"
              />
              <path
                fill="#4A90E2"
                d="M12 21.2c2.6 0 4.8-.9 6.4-2.4l-3-2.5c-.8.6-1.9 1-3.4 1-2.7 0-5-1.8-5.9-4.3l-3.2 2.5c1.5 2.9 4.6 4.7 9.1 4.7z"
              />
              <path
                fill="#FBBC05"
                d="M3.7 15.5l3.2-2.5c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6L3.7 7.3C3.1 8.5 2.8 9.9 2.8 11.4s.3 2.9.9 4.1z"
              />
            </svg>
            <span>Continue with Google</span>
          </Button>
        </form>
      </section>
    </main>
  )
}
