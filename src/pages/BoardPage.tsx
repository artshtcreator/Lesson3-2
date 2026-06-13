import { toast } from 'sonner'
import { Board } from '@/components/board/Board'
import { Button } from '@/components/ui/Button'
import { useBoard } from '@/hooks/useBoard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useBoardDnd } from '@/features/board/hooks/useBoardDnd'

export const BoardPage = (): JSX.Element => {
  const { columns, cardsByColumn, getCardById, moveCard } = useBoard()
  const { signOut } = useAuth()
  const { sensors, onDragEnd, getCardDndId, getColumnDndId } = useBoardDnd({
    cardsByColumn,
    getCardById,
    moveCard,
  })

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut()
      toast.success('You have been logged out.')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to log out.'
      toast.error(message)
    }
  }

  return (
    <main className="min-h-screen bg-surface-50 px-4 py-8 dark:bg-surface-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-50">AI Task Board</h1>
            <p className="text-sm text-surface-800 dark:text-surface-100">
              Trello-like MVP board with drag-and-drop cards.
            </p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </header>

        <Board
          columns={columns}
          cardsByColumn={cardsByColumn}
          sensors={sensors}
          onDragEnd={onDragEnd}
          getCardDndId={getCardDndId}
          getColumnDndId={getColumnDndId}
        />
      </div>
    </main>
  )
}
