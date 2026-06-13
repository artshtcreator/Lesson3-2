import { DndContext } from '@dnd-kit/core'
import type { DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core'
import { Column } from '@/components/board/Column'
import type { BoardCard, BoardColumn } from '@/types/board'

export interface BoardProps {
  columns: BoardColumn[]
  cardsByColumn: Record<string, BoardCard[]>
  sensors: SensorDescriptor<SensorOptions>[]
  onDragEnd: (event: DragEndEvent) => void
  getCardDndId: (cardId: string) => string
  getColumnDndId: (columnId: string) => string
}

export const Board = ({
  columns,
  cardsByColumn,
  sensors,
  onDragEnd,
  getCardDndId,
  getColumnDndId,
}: BoardProps): JSX.Element => (
  <DndContext sensors={sensors} onDragEnd={onDragEnd}>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          cards={cardsByColumn[column.id] ?? []}
          columnDndId={getColumnDndId(column.id)}
          getCardDndId={getCardDndId}
        />
      ))}
    </div>
  </DndContext>
)
