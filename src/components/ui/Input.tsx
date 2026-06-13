import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = ({ label, error, className = '', id, ...inputProps }: InputProps): JSX.Element => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-surface-900 dark:text-surface-50">{label}</span>
    <input
      id={id}
      className={`w-full rounded-card border border-surface-100 bg-white px-3 py-2 text-surface-900 outline-none transition focus:border-brand-500 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-50 ${className}`}
      {...inputProps}
    />
    {error ? <span className="mt-1 block text-xs text-danger-500">{error}</span> : null}
  </label>
)
