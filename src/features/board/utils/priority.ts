import type { TaskPriority } from '@/types/board'

const priorityLabelMap: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const priorityClassMap: Record<TaskPriority, string> = {
  low: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200',
  medium: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400',
  high: 'bg-danger-50 text-danger-600 dark:bg-danger-950/30 dark:text-danger-400',
}

export const getPriorityLabel = (priority: TaskPriority): string => priorityLabelMap[priority]

export const getPriorityClassName = (priority: TaskPriority): string => priorityClassMap[priority]
