import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { BoardMemberOption, CreateTaskPayload } from '@/types/board'

interface CreateTaskModalProps {
  open: boolean
  members: BoardMemberOption[]
  isLoadingMembers?: boolean
  membersLoadError?: string | null
  isSubmitting?: boolean
  onClose: () => void
  onCreate: (payload: CreateTaskPayload) => void | Promise<void>
}

export const CreateTaskModal = ({
  open,
  members,
  isLoadingMembers = false,
  membersLoadError = null,
  isSubmitting = false,
  onClose,
  onCreate,
}: CreateTaskModalProps): JSX.Element | null => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [titleError, setTitleError] = useState<string>()

  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setAssigneeId('')
      setTitleError(undefined)
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
    if (members.length === 0) {
      setAssigneeId('')
      return
    }

    if (assigneeId.length === 0) {
      setAssigneeId(members[0].id)
    }
  }, [members, assigneeId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const trimmedTitle = title.trim()
    if (trimmedTitle.length === 0) {
      setTitleError('Task title is required.')
      return
    }

    setTitleError(undefined)
    await onCreate({
      title: trimmedTitle,
      description: description.trim(),
      assigneeId: assigneeId.length > 0 ? assigneeId : null,
    })
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/60 px-4 py-8">
      <section className="w-full max-w-xl rounded-modal border border-surface-100 bg-white p-6 shadow-xl dark:border-surface-800 dark:bg-surface-800">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">Create task</h2>
        <p className="mt-2 text-sm text-surface-800 dark:text-surface-100">
          New tasks are added to the To Do column.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            id="create-task-title"
            label="Task title"
            placeholder="Implement login flow"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={titleError}
            required
          />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-surface-900 dark:text-surface-50">Description</span>
            <textarea
              id="create-task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Describe what needs to be done..."
              className="w-full rounded-card border border-surface-100 bg-white px-3 py-2 text-surface-900 outline-none transition focus:border-brand-500 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-surface-900 dark:text-surface-50">Assignee</span>
            <select
              id="create-task-assignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              disabled={isLoadingMembers || membersLoadError !== null || members.length === 0}
              className="w-full rounded-card border border-surface-100 bg-white px-3 py-2 text-surface-900 outline-none transition focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-50"
            >
              {isLoadingMembers ? <option value="">Loading members...</option> : null}
              {!isLoadingMembers && members.length === 0 ? <option value="">No board members found</option> : null}
              {!isLoadingMembers && members.length > 0
                ? members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName} ({member.email})
                    </option>
                  ))
                : null}
            </select>
          </label>

          {membersLoadError ? <p className="text-sm text-danger-500">{membersLoadError}</p> : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={members.length === 0}>
              Create
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
