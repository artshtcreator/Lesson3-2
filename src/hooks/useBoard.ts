import { useMemo } from 'react'
import type { BoardCard, BoardColumn } from '@/types/board'
import { useBoardStore } from '@/store/useBoardStore'

interface UseBoardResult {
  columns: BoardColumn[]
  cardsByColumn: Record<string, BoardCard[]>
  getCardById: (cardId: string) => BoardCard | undefined
  moveCard: (payload: { cardId: string; toColumnId: string; toIndex: number }) => void
}

export const useBoard = (): UseBoardResult => {
  const columns = useBoardStore((state) => state.columns)
  const cards = useBoardStore((state) => state.cards)
  const moveCard = useBoardStore((state) => state.moveCard)

  const cardsByColumn = useMemo<Record<string, BoardCard[]>>(() => {
    const grouped = cards.reduce<Record<string, BoardCard[]>>((result, card) => {
      result[card.columnId] = result[card.columnId] ?? []
      result[card.columnId].push(card)
      return result
    }, {})

    return Object.fromEntries(
      Object.entries(grouped).map(([columnId, groupCards]) => [
        columnId,
        [...groupCards].sort((left, right) => left.position - right.position),
      ]),
    )
  }, [cards])

  const getCardById = (cardId: string): BoardCard | undefined => cards.find((card) => card.id === cardId)

  return {
    columns,
    cardsByColumn,
    getCardById,
    moveCard,
  }
}
