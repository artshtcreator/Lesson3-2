import type { BoardCard } from '@/types/board'

interface CardContentProps {
  card: BoardCard
}

export const CardContent = ({ card }: CardContentProps): JSX.Element => (
  <>
    <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">{card.title}</h3>
    <p className="mt-1 text-xs text-surface-800 dark:text-surface-100">{card.description}</p>
    <div className="mt-3 rounded-card bg-surface-50 px-2 py-1.5 dark:bg-surface-800/60">
      <p className="text-xs font-medium text-brand-600 dark:text-brand-500">Assigned: {card.assigneeName}</p>
      {card.assigneeEmail ? (
        <p className="text-xs text-surface-700 dark:text-surface-200">{card.assigneeEmail}</p>
      ) : null}
    </div>
  </>
)
