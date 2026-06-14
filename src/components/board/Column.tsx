import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card } from '@/components/board/Card'
import type { BoardCard, BoardColumn } from '@/types/board'

export interface ColumnProps {
  column: BoardColumn
  cards: BoardCard[]
  columnDndId: string
  getCardDndId: (cardId: string) => string
  onCardOpen?: (card: BoardCard) => void
}

export const Column = ({ column, cards, columnDndId, getCardDndId, onCardOpen }: ColumnProps): JSX.Element => {
  const { setNodeRef, isOver } = useDroppable({ id: columnDndId })
  const cardDndIds = cards.map((card) => getCardDndId(card.id))

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[380px] w-full max-w-sm flex-col rounded-modal border bg-surface-50 p-3 dark:bg-surface-900 ${
        isOver ? 'border-brand-500' : 'border-surface-100 dark:border-surface-800'
      }`}
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">{column.title}</h2>
        <span className="rounded-card bg-surface-100 px-2 py-0.5 text-xs text-surface-800 dark:bg-surface-800 dark:text-surface-100">
          {cards.length}
        </span>
      </header>

      <SortableContext items={cardDndIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {cards.map((card) => (
            <Card key={card.id} card={card} dndId={getCardDndId(card.id)} onOpen={onCardOpen} />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}
