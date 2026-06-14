import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { BoardMemberOption, CreateBoardPayload } from '@/types/board'

interface CreateBoardModalProps {
  open: boolean
  users: BoardMemberOption[]
  isLoadingUsers?: boolean
  usersLoadError?: string | null
  isSubmitting?: boolean
  onClose: () => void
  onCreate: (payload: CreateBoardPayload) => void | Promise<void>
}

export const CreateBoardModal = ({
  open,
  users,
  isLoadingUsers = false,
  usersLoadError = null,
  isSubmitting = false,
  onClose,
  onCreate,
}: CreateBoardModalProps): JSX.Element | null => {
  const [boardName, setBoardName] = useState('')
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<BoardMemberOption[]>([])
  const [nameError, setNameError] = useState<string>()
  const [selectionError, setSelectionError] = useState<string>()

  useEffect(() => {
    if (!open) {
      setBoardName('')
      setPendingUserIds([])
      setIsDropdownOpen(false)
      setSelectedUsers([])
      setNameError(undefined)
      setSelectionError(undefined)
      return
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  useEffect(() => {
    setPendingUserIds((previous) => previous.filter((userId) => users.some((user) => user.id === userId)))
  }, [users])

  const selectedCount = useMemo(() => selectedUsers.length, [selectedUsers.length])
  const checkedCount = useMemo(() => pendingUserIds.length, [pendingUserIds.length])

  const togglePendingUser = (userId: string): void => {
    setPendingUserIds((previous) =>
      previous.includes(userId) ? previous.filter((id) => id !== userId) : [...previous, userId],
    )
  }

  const addSelectedUsers = (): void => {
    if (pendingUserIds.length === 0) {
      setSelectionError('Select at least one user first.')
      return
    }

    const usersToAdd = users.filter((user) => pendingUserIds.includes(user.id))
    if (usersToAdd.length === 0) {
      setSelectionError('Selected users are unavailable.')
      return
    }

    const alreadySelectedIds = new Set(selectedUsers.map((user) => user.id))
    const uniqueUsersToAdd = usersToAdd.filter((user) => !alreadySelectedIds.has(user.id))

    if (uniqueUsersToAdd.length === 0) {
      setSelectionError('Selected users are already in the list.')
      return
    }

    setSelectedUsers((previous) => [...previous, ...uniqueUsersToAdd])
    setPendingUserIds([])
    setIsDropdownOpen(false)
    setSelectionError(undefined)
  }

  const removeUser = (userId: string): void => {
    setSelectedUsers((previous) => previous.filter((user) => user.id !== userId))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const trimmedBoardName = boardName.trim()
    if (trimmedBoardName.length === 0) {
      setNameError('Board name is required.')
      return
    }

    setNameError(undefined)
    await onCreate({
      name: trimmedBoardName,
      memberIds: selectedUsers.map((user) => user.id),
    })
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/60 px-4 py-8">
      <section className="w-full max-w-xl rounded-modal border border-surface-100 bg-white p-6 shadow-xl dark:border-surface-800 dark:bg-surface-800">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">Create board</h2>
        <p className="mt-2 text-sm text-surface-800 dark:text-surface-100">
          Add board name and invite teammates from registered emails.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            id="create-board-name"
            label="Board name"
            placeholder="Roadmap Q3"
            value={boardName}
            onChange={(event) => setBoardName(event.target.value)}
            error={nameError}
            required
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-surface-900 dark:text-surface-50">Invite by email</legend>
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between border border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900"
                disabled={isLoadingUsers || usersLoadError !== null || users.length === 0}
                onClick={() => setIsDropdownOpen((previous) => !previous)}
              >
                <span>{checkedCount > 0 ? `Approved: ${checkedCount}` : 'Select users to approve'}</span>
                <span aria-hidden="true">{isDropdownOpen ? '▲' : '▼'}</span>
              </Button>

              {isDropdownOpen ? (
                <div className="absolute z-10 mt-2 max-h-48 w-full overflow-y-auto rounded-card border border-surface-100 bg-white p-2 shadow-lg dark:border-surface-700 dark:bg-surface-900">
                  {users.map((user) => (
                    <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded-card p-2 hover:bg-surface-50 dark:hover:bg-surface-800">
                      <input
                        type="checkbox"
                        checked={pendingUserIds.includes(user.id)}
                        onChange={() => togglePendingUser(user.id)}
                        className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="min-w-0 text-sm text-surface-900 dark:text-surface-50">{user.email}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2">
              {usersLoadError ? <p className="text-sm text-danger-500">{usersLoadError}</p> : <span />}
              <Button
                type="button"
                onClick={addSelectedUsers}
                disabled={isLoadingUsers || usersLoadError !== null || users.length === 0}
              >
                Add
              </Button>
            </div>
            {selectionError ? <p className="text-sm text-danger-500">{selectionError}</p> : null}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-surface-900 dark:text-surface-50">
              Selected users ({selectedCount})
            </legend>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-card border border-surface-100 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-900/40">
              {selectedUsers.length === 0 ? (
                <p className="text-sm text-surface-700 dark:text-surface-200">No users selected yet.</p>
              ) : null}
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-card border border-transparent p-2 transition hover:border-surface-200 hover:bg-white dark:hover:border-surface-700 dark:hover:bg-surface-800"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-surface-900 dark:text-surface-50">{user.displayName}</span>
                    <span className="block text-xs text-surface-700 dark:text-surface-200">
                      {user.email}
                      {user.role ? ` • ${user.role}` : ''}
                    </span>
                  </span>
                  <Button type="button" variant="ghost" onClick={() => removeUser(user.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
