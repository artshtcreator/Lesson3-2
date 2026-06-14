import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CardContent } from '@/components/board/CardContent'
import type { BoardCard } from '@/types/board'

export interface CardProps {
  card: BoardCard
  dndId: string
  onOpen?: (card: BoardCard) => void
}

export const Card = ({ card, dndId, onOpen }: CardProps): JSX.Element => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-card border border-surface-100 bg-white p-3 shadow-sm dark:border-surface-800 dark:bg-surface-900"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Drag task"
          className="mt-0.5 cursor-grab rounded-card px-1 text-surface-500 hover:bg-surface-100 active:cursor-grabbing dark:hover:bg-surface-800"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen?.(card)}
        >
          <CardContent card={card} />
        </button>
      </div>
    </article>
  )
}

interface CardDragOverlayProps {
  card: BoardCard
}

export const CardDragOverlay = ({ card }: CardDragOverlayProps): JSX.Element => (
  <article className="cursor-grabbing rounded-card border border-brand-500 bg-white p-3 shadow-lg ring-2 ring-brand-500/30 dark:border-brand-500 dark:bg-surface-900">
    <CardContent card={card} />
  </article>
)
