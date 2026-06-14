import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Board } from '@/components/board/Board'
import { getBoardById, getBoardKanbanState } from '@/features/board/api/boards'
import { useBoard } from '@/hooks/useBoard'
import { useBoardDnd } from '@/features/board/hooks/useBoardDnd'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useBoardStore } from '@/store/useBoardStore'

export const BoardDetailPage = (): JSX.Element => {
  const { boardId } = useParams<{ boardId: string }>()
  const setBoardState = useBoardStore((state) => state.setBoardState)
  const resetBoardState = useBoardStore((state) => state.resetBoardState)
  const { columns, cardsByColumn, getCardById, moveCard } = useBoard()
  const [boardName, setBoardName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { sensors, activeCard, onDragStart, onDragEnd, onDragCancel, getCardDndId, getColumnDndId } = useBoardDnd({
    cardsByColumn,
    getCardById,
    moveCard,
  })

  useEffect(() => {
    if (!boardId || !isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadBoard = async (): Promise<void> => {
      setIsLoading(true)
      try {
        const [board, kanbanState] = await Promise.all([getBoardById(boardId), getBoardKanbanState(boardId)])
        if (!isMounted) {
          return
        }
        setBoardName(board.name)
        setBoardState(boardId, kanbanState)
      } catch (error: unknown) {
        if (!isMounted) {
          return
        }
        const message = error instanceof Error ? error.message : 'Failed to load board.'
        toast.error(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadBoard()

    return () => {
      isMounted = false
      resetBoardState()
    }
  }, [boardId, resetBoardState, setBoardState])

  if (!boardId) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <p className="text-sm text-danger-500">Board id is missing.</p>
        <Link to="/boards" className="mt-2 inline-block text-sm text-brand-600 hover:underline">
          Back to boards
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/boards" className="text-sm text-brand-600 hover:underline">
            Back to boards
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-surface-900 dark:text-surface-50">
            {isLoading ? 'Loading board...' : boardName}
          </h1>
          <p className="text-sm text-surface-800 dark:text-surface-100">
            Tasks in To Do are assigned to board members.
          </p>
        </div>
        <Link
          to="/boards"
          className="inline-flex items-center justify-center rounded-card px-4 py-2 text-sm font-medium text-surface-900 transition hover:bg-surface-100 dark:text-surface-50 dark:hover:bg-surface-800"
        >
          All boards
        </Link>
      </header>

      {isLoading ? (
        <p className="text-sm text-surface-700 dark:text-surface-200">Loading tasks...</p>
      ) : (
        <Board
          columns={columns}
          cardsByColumn={cardsByColumn}
          sensors={sensors}
          activeCard={activeCard}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          getCardDndId={getCardDndId}
          getColumnDndId={getColumnDndId}
        />
      )}
    </div>
  )
}
