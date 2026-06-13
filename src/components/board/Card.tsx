import { useSortable } from '@dnd-kit/sortable'
import type { BoardCard } from '@/types/board'

export interface CardProps {
  card: BoardCard
  dndId: string
}

export const Card = ({ card, dndId }: CardProps): JSX.Element => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition,
      }
    : { transition }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-card border border-surface-100 bg-white p-3 shadow-sm dark:border-surface-800 dark:bg-surface-900 ${
        isDragging ? 'opacity-60' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">{card.title}</h3>
      <p className="mt-1 text-xs text-surface-800 dark:text-surface-100">{card.description}</p>
      <p className="mt-3 text-xs font-medium text-brand-600 dark:text-brand-500">{card.assigneeName}</p>
    </article>
  )
}
