import { useMemo } from 'react'
import type { DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core'
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { BoardCard } from '@/types/board'

const CARD_PREFIX = 'card:'
const COLUMN_PREFIX = 'column:'

const getCardDndId = (cardId: string): string => `${CARD_PREFIX}${cardId}`
const getColumnDndId = (columnId: string): string => `${COLUMN_PREFIX}${columnId}`

const extractCardId = (dndId: string): string | null => (dndId.startsWith(CARD_PREFIX) ? dndId.slice(CARD_PREFIX.length) : null)
const extractColumnId = (dndId: string): string | null =>
  dndId.startsWith(COLUMN_PREFIX) ? dndId.slice(COLUMN_PREFIX.length) : null

interface UseBoardDndParams {
  cardsByColumn: Record<string, BoardCard[]>
  getCardById: (cardId: string) => BoardCard | undefined
  moveCard: (payload: { cardId: string; toColumnId: string; toIndex: number }) => void
}

interface UseBoardDndResult {
  sensors: SensorDescriptor<SensorOptions>[]
  onDragEnd: (event: DragEndEvent) => void
  getCardDndId: (cardId: string) => string
  getColumnDndId: (columnId: string) => string
}

export const useBoardDnd = ({ cardsByColumn, getCardById, moveCard }: UseBoardDndParams): UseBoardDndResult => {
  const pointerSensor = useSensor(PointerSensor)
  const keyboardSensor = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  const sensors = useSensors(pointerSensor, keyboardSensor)

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (!over) {
      return
    }

    const activeCardId = extractCardId(String(active.id))

    if (!activeCardId) {
      return
    }

    const overId = String(over.id)
    const overCardId = extractCardId(overId)
    const overColumnId = extractColumnId(overId)

    if (overCardId) {
      const overCard = getCardById(overCardId)

      if (!overCard) {
        return
      }

      const targetCards = (cardsByColumn[overCard.columnId] ?? []).filter((card) => card.id !== activeCardId)
      const targetIndex = targetCards.findIndex((card) => card.id === overCardId)

      moveCard({
        cardId: activeCardId,
        toColumnId: overCard.columnId,
        toIndex: targetIndex < 0 ? targetCards.length : targetIndex,
      })

      return
    }

    if (overColumnId) {
      const targetCards = (cardsByColumn[overColumnId] ?? []).filter((card) => card.id !== activeCardId)
      moveCard({
        cardId: activeCardId,
        toColumnId: overColumnId,
        toIndex: targetCards.length,
      })
    }
  }

  return useMemo(
    () => ({
      sensors,
      onDragEnd,
      getCardDndId,
      getColumnDndId,
    }),
    [sensors, onDragEnd],
  )
}
