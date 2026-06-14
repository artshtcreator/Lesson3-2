import { useCallback, useMemo, useState } from 'react'
import type { DragCancelEvent, DragEndEvent, DragStartEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core'
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
  activeCard: BoardCard | null
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onDragCancel: (event: DragCancelEvent) => void
  getCardDndId: (cardId: string) => string
  getColumnDndId: (columnId: string) => string
}

export const useBoardDnd = ({ cardsByColumn, getCardById, moveCard }: UseBoardDndParams): UseBoardDndResult => {
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null)
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6,
    },
  })
  const keyboardSensor = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  const sensors = useSensors(pointerSensor, keyboardSensor)

  const onDragStart = useCallback(
    (event: DragStartEvent): void => {
      const activeCardId = extractCardId(String(event.active.id))

      if (!activeCardId) {
        setActiveCard(null)
        return
      }

      setActiveCard(getCardById(activeCardId) ?? null)
    },
    [getCardById],
  )

  const onDragCancel = useCallback((): void => {
    setActiveCard(null)
  }, [])

  const onDragEnd = useCallback(
    (event: DragEndEvent): void => {
      setActiveCard(null)

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
    },
    [cardsByColumn, getCardById, moveCard],
  )

  return useMemo(
    () => ({
      sensors,
      activeCard,
      onDragStart,
      onDragEnd,
      onDragCancel,
      getCardDndId,
      getColumnDndId,
    }),
    [sensors, activeCard, onDragStart, onDragEnd, onDragCancel],
  )
}
