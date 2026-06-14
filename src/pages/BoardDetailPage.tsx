import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Board } from '@/components/board/Board'
import { CreateTaskModal } from '@/components/board/CreateTaskModal'
import { TaskDetailModal } from '@/components/board/TaskDetailModal'
import { Button } from '@/components/ui/Button'
import {
  createBoardTask,
  deleteBoardTask,
  getBoardById,
  getBoardKanbanState,
  listBoardMembers,
  updateBoardTask,
} from '@/features/board/api/boards'
import { useBoard } from '@/hooks/useBoard'
import { useBoardDnd } from '@/features/board/hooks/useBoardDnd'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useBoardStore } from '@/store/useBoardStore'
import type { BoardCard, BoardMemberOption, CreateTaskPayload, UpdateTaskPayload } from '@/types/board'

export const BoardDetailPage = (): JSX.Element => {
  const { boardId } = useParams<{ boardId: string }>()
  const setBoardState = useBoardStore((state) => state.setBoardState)
  const resetBoardState = useBoardStore((state) => state.resetBoardState)
  const deleteCard = useBoardStore((state) => state.deleteCard)
  const { columns, cardsByColumn, getCardById, moveCard } = useBoard()
  const [boardName, setBoardName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [boardMembers, setBoardMembers] = useState<BoardMemberOption[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [membersLoadError, setMembersLoadError] = useState<string | null>(null)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<BoardCard | null>(null)
  const { sensors, activeCard, onDragStart, onDragEnd, onDragCancel, getCardDndId, getColumnDndId } = useBoardDnd({
    cardsByColumn,
    getCardById,
    moveCard,
  })

  const reloadBoard = useCallback(async (): Promise<void> => {
    if (!boardId || !isSupabaseConfigured) {
      return
    }

    const [board, kanbanState] = await Promise.all([getBoardById(boardId), getBoardKanbanState(boardId)])
    setBoardName(board.name)
    setBoardState(boardId, kanbanState)
  }, [boardId, setBoardState])

  useEffect(() => {
    if (!boardId || !isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadBoard = async (): Promise<void> => {
      setIsLoading(true)
      try {
        await reloadBoard()
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
  }, [boardId, reloadBoard, resetBoardState])

  useEffect(() => {
    if ((!isCreateTaskModalOpen && selectedTask === null) || !boardId || !isSupabaseConfigured) {
      return
    }

    let isMounted = true

    const loadMembers = async (): Promise<void> => {
      setIsLoadingMembers(true)
      setMembersLoadError(null)

      try {
        const members = await listBoardMembers(boardId)
        if (!isMounted) {
          return
        }
        setBoardMembers(members)
      } catch (error: unknown) {
        if (!isMounted) {
          return
        }
        const message = error instanceof Error ? error.message : 'Failed to load board members.'
        setMembersLoadError(message)
      } finally {
        if (isMounted) {
          setIsLoadingMembers(false)
        }
      }
    }

    void loadMembers()

    return () => {
      isMounted = false
    }
  }, [boardId, isCreateTaskModalOpen, selectedTask])

  const handleCreateTask = async (payload: CreateTaskPayload): Promise<void> => {
    if (!boardId) {
      return
    }

    setIsCreatingTask(true)
    try {
      await createBoardTask(boardId, payload)
      await reloadBoard()
      toast.success('Task created in To Do.')
      setIsCreateTaskModalOpen(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create task.'
      toast.error(message)
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleCardOpen = (card: BoardCard): void => {
    setSelectedTask(card)
  }

  const handleUpdateTask = async (taskId: string, payload: UpdateTaskPayload): Promise<void> => {
    setIsSavingTask(true)
    try {
      await updateBoardTask(taskId, payload)
      await reloadBoard()
      const updatedTask = getCardById(taskId)
      if (updatedTask) {
        setSelectedTask(updatedTask)
      }
      toast.success('Task updated.')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update task.'
      toast.error(message)
      throw error
    } finally {
      setIsSavingTask(false)
    }
  }

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    setIsSavingTask(true)
    try {
      await deleteBoardTask(taskId)
      deleteCard(taskId)
      setSelectedTask(null)
      toast.success('Task deleted.')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete task.'
      toast.error(message)
      throw error
    } finally {
      setIsSavingTask(false)
    }
  }

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
    <>
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
              Create tasks, assign board members, and open a task to view details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setIsCreateTaskModalOpen(true)}>
              Create task
            </Button>
            <Link
              to="/boards"
              className="inline-flex items-center justify-center rounded-card px-4 py-2 text-sm font-medium text-surface-900 transition hover:bg-surface-100 dark:text-surface-50 dark:hover:bg-surface-800"
            >
              All boards
            </Link>
          </div>
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
            onCardOpen={handleCardOpen}
          />
        )}
      </div>

      <CreateTaskModal
        open={isCreateTaskModalOpen}
        members={boardMembers}
        isLoadingMembers={isLoadingMembers}
        membersLoadError={membersLoadError}
        isSubmitting={isCreatingTask}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onCreate={handleCreateTask}
      />

      <TaskDetailModal
        open={selectedTask !== null}
        task={selectedTask}
        columns={columns}
        members={boardMembers}
        isLoadingMembers={isLoadingMembers}
        membersLoadError={membersLoadError}
        isSaving={isSavingTask}
        onClose={() => setSelectedTask(null)}
        onSave={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </>
  )
}
