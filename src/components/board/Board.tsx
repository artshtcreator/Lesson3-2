import { DndContext, DragOverlay } from '@dnd-kit/core'
import type { DragCancelEvent, DragEndEvent, DragStartEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core'
import { CardDragOverlay } from '@/components/board/Card'
import { Column } from '@/components/board/Column'
import type { BoardCard, BoardColumn } from '@/types/board'

export interface BoardProps {
  columns: BoardColumn[]
  cardsByColumn: Record<string, BoardCard[]>
  sensors: SensorDescriptor<SensorOptions>[]
  activeCard: BoardCard | null
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onDragCancel: (event: DragCancelEvent) => void
  getCardDndId: (cardId: string) => string
  getColumnDndId: (columnId: string) => string
  onCardOpen?: (card: BoardCard) => void
}

export const Board = ({
  columns,
  cardsByColumn,
  sensors,
  activeCard,
  onDragStart,
  onDragEnd,
  onDragCancel,
  getCardDndId,
  getColumnDndId,
  onCardOpen,
}: BoardProps): JSX.Element => (
  <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          cards={cardsByColumn[column.id] ?? []}
          columnDndId={getColumnDndId(column.id)}
          getCardDndId={getCardDndId}
          onCardOpen={onCardOpen}
        />
      ))}
    </div>
    <DragOverlay dropAnimation={null}>
      {activeCard ? <CardDragOverlay card={activeCard} /> : null}
    </DragOverlay>
  </DndContext>
)
