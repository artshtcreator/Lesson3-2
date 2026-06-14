import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CreateBoardModal } from '@/components/board/CreateBoardModal'
import { Button } from '@/components/ui/Button'
import { createBoardWithMembers, listBoards, listBoardUsers } from '@/features/board/api/boards'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { BoardMemberOption, CreateBoardPayload } from '@/types/board'
import type { BoardSummary } from '@/features/board/api/boards'

export const BoardListPage = (): JSX.Element => {
  const navigate = useNavigate()
  const { signOut, session } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<BoardMemberOption[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersLoadError, setUsersLoadError] = useState<string | null>(null)
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [isLoadingBoards, setIsLoadingBoards] = useState(false)

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut()
      toast.success('You have been logged out.')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to log out.'
      toast.error(message)
    }
  }

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    if (!isSupabaseConfigured) {
      setAvailableUsers([])
      setUsersLoadError('Supabase is not configured. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    let isMounted = true

    const loadUsers = async (): Promise<void> => {
      setIsLoadingUsers(true)
      setUsersLoadError(null)

      try {
        const users = await listBoardUsers()
        if (!isMounted) {
          return
        }
        setAvailableUsers(users)
      } catch (error: unknown) {
        if (!isMounted) {
          return
        }
        const message = error instanceof Error ? error.message : 'Failed to load users.'
        setUsersLoadError(message)
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isMounted = false
    }
  }, [isCreateModalOpen])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    let isMounted = true

    const loadBoards = async (): Promise<void> => {
      setIsLoadingBoards(true)
      try {
        const nextBoards = await listBoards()
        if (!isMounted) {
          return
        }
        setBoards(nextBoards)
      } catch (error: unknown) {
        if (!isMounted) {
          return
        }
        const message = error instanceof Error ? error.message : 'Failed to load boards.'
        toast.error(message)
      } finally {
        if (isMounted) {
          setIsLoadingBoards(false)
        }
      }
    }

    void loadBoards()

    return () => {
      isMounted = false
    }
  }, [])

  const handleCreateBoard = async (payload: CreateBoardPayload): Promise<void> => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    if (!session?.user?.id) {
      toast.error('Your session is missing. Please sign in again.')
      return
    }

    setIsCreatingBoard(true)
    try {
      const memberIds = Array.from(new Set([session.user.id, ...payload.memberIds]))
      const boardId = await createBoardWithMembers(payload.name, memberIds)
      toast.success(`Board "${payload.name}" created.`)
      setIsCreateModalOpen(false)
      navigate(`/boards/${boardId}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create board.'
      toast.error(message)
    } finally {
      setIsCreatingBoard(false)
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-50">Boards</h1>
            <p className="text-sm text-surface-800 dark:text-surface-100">Open a board to view tasks and assignees.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setIsCreateModalOpen(true)}>
              Create board
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        <section className="rounded-modal border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-800">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Your boards</h2>
          {isLoadingBoards ? <p className="mt-2 text-sm text-surface-700 dark:text-surface-200">Loading boards...</p> : null}
          {!isLoadingBoards && boards.length === 0 ? (
            <p className="mt-2 text-sm text-surface-700 dark:text-surface-200">No boards created yet.</p>
          ) : null}
          {boards.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {boards.map((board) => (
                <li key={board.id}>
                  <Link
                    to={`/boards/${board.id}`}
                    className="block rounded-card border border-surface-100 px-3 py-2 text-sm transition hover:border-brand-500 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-900/40"
                  >
                    <span className="font-medium text-surface-900 dark:text-surface-50">{board.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
      <CreateBoardModal
        open={isCreateModalOpen}
        users={availableUsers}
        isLoadingUsers={isLoadingUsers}
        usersLoadError={usersLoadError}
        isSubmitting={isCreatingBoard}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateBoard}
      />
    </>
  )
}
