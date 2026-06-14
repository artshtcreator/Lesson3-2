import { create } from 'zustand'
import { moveBoardTask } from '@/features/board/api/boards'
import { mockBoardState } from '@/features/board/data/mockBoard'
import type { BoardCard, BoardColumn, BoardState } from '@/types/board'

interface MoveCardPayload {
  cardId: string
  toColumnId: string
  toIndex: number
}

interface BoardStoreState {
  currentBoardId: string | null
  columns: BoardColumn[]
  cards: BoardCard[]
  setBoardState: (boardId: string, state: BoardState) => void
  resetBoardState: () => void
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

const initialColumns = [...mockBoardState.columns].sort(sortByPosition)
const initialCards = [...mockBoardState.cards].sort(sortByPosition)

export const useBoardStore = create<BoardStoreState>((set, get) => ({
  currentBoardId: null,
  columns: initialColumns,
  cards: initialCards,
  setBoardState: (boardId: string, state: BoardState): void => {
    set({
      currentBoardId: boardId,
      columns: [...state.columns].sort(sortByPosition),
      cards: [...state.cards].sort(sortByPosition),
    })
  },
  resetBoardState: (): void => {
    set({
      currentBoardId: null,
      columns: initialColumns,
      cards: initialCards,
    })
  },
  moveCard: ({ cardId, toColumnId, toIndex }: MoveCardPayload): void => {
    const { cards, currentBoardId } = get()
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

    if (currentBoardId) {
      void moveBoardTask(cardId, toColumnId, nextPosition).catch(() => undefined)
    }
  },
}))
