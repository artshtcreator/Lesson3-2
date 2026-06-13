import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
  children: ReactNode
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  ghost: 'bg-transparent text-surface-900 hover:bg-surface-100 dark:text-surface-50 dark:hover:bg-surface-800',
  danger: 'bg-danger-500 text-white hover:opacity-90',
}

export const Button = ({
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...buttonProps
}: ButtonProps): JSX.Element => (
  <button
    className={`inline-flex items-center justify-center rounded-card px-4 py-2 text-sm font-medium transition ${variantClassMap[variant]} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    disabled={disabled || isLoading}
    {...buttonProps}
  >
    {isLoading ? 'Loading...' : children}
  </button>
)
