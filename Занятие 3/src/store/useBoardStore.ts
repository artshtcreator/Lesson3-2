import { create } from 'zustand'
import { mockBoardState } from '@/features/board/data/mockBoard'
import type { BoardCard, BoardColumn } from '@/types/board'

interface MoveCardPayload {
  cardId: string
  toColumnId: string
  toIndex: number
}

interface BoardStoreState {
  columns: BoardColumn[]
  cards: BoardCard[]
  moveCard: (payload: MoveCardPayload) => void
}

const POSITION_GAP = 1024

const sortByPosition = (left: { position: number }, right: { position: number }): number =>
  left.position - right.position

const getNextPosition = (cards: BoardCard[], targetIndex: number): number => {
  const previousCard = cards[targetIndex - 1]
  const nextCard = cards[targetIndex]

  if (previousCard && nextCard) {
    return (previousCard.position + nextCard.position) / 2
  }

  if (!previousCard && nextCard) {
    return nextCard.position - POSITION_GAP
  }

  if (previousCard && !nextCard) {
    return previousCard.position + POSITION_GAP
  }

  return POSITION_GAP
}

export const useBoardStore = create<BoardStoreState>((set, get) => ({
  columns: [...mockBoardState.columns].sort(sortByPosition),
  cards: [...mockBoardState.cards].sort(sortByPosition),
  moveCard: ({ cardId, toColumnId, toIndex }: MoveCardPayload): void => {
    const { cards } = get()
    const sourceCard = cards.find((card) => card.id === cardId)

    if (!sourceCard) {
      return
    }

    const targetCards = cards
      .filter((card) => card.columnId === toColumnId && card.id !== cardId)
      .sort(sortByPosition)

    const normalizedIndex = Math.max(0, Math.min(toIndex, targetCards.length))
    const nextPosition = getNextPosition(targetCards, normalizedIndex)

    const updatedCards = cards.map((card) =>
      card.id === cardId ? { ...card, columnId: toColumnId, position: nextPosition } : card,
    )

    set({ cards: [...updatedCards].sort(sortByPosition) })
  },
}))
