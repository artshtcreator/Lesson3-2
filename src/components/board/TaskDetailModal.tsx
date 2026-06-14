import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getPriorityLabel } from '@/features/board/utils/priority'
import type { BoardCard, BoardColumn, BoardMemberOption, TaskPriority, UpdateTaskPayload } from '@/types/board'

interface TaskDetailModalProps {
  open: boolean
  task: BoardCard | null
  columns: BoardColumn[]
  members: BoardMemberOption[]
  isLoadingMembers?: boolean
  membersLoadError?: string | null
  isSaving?: boolean
  onClose: () => void
  onSave: (taskId: string, payload: UpdateTaskPayload) => void | Promise<void>
  onDelete: (taskId: string) => void | Promise<void>
}

const priorityOptions: TaskPriority[] = ['low', 'medium', 'high']

export const TaskDetailModal = ({
  open,
  task,
  columns,
  members,
  isLoadingMembers = false,
  membersLoadError = null,
  isSaving = false,
  onClose,
  onSave,
  onDelete,
}: TaskDetailModalProps): JSX.Element | null => {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])
  const [pendingAssigneeIds, setPendingAssigneeIds] = useState<string[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [titleError, setTitleError] = useState<string>()
  const [selectionError, setSelectionError] = useState<string>()

  useEffect(() => {
    if (!open || !task) {
      setIsEditing(false)
      setTitle('')
      setDescription('')
      setPriority('medium')
      setSelectedAssigneeIds([])
      setPendingAssigneeIds([])
      setIsDropdownOpen(false)
      setTitleError(undefined)
      setSelectionError(undefined)
      return
    }

    setTitle(task.title)
    setDescription(task.description)
    setPriority(task.priority)
    setSelectedAssigneeIds(task.assigneeIds)

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, task, onClose])

  const selectedAssignees = useMemo(
    () => members.filter((member) => selectedAssigneeIds.includes(member.id)),
    [members, selectedAssigneeIds],
  )

  const availableMembers = useMemo(
    () => members.filter((member) => !selectedAssigneeIds.includes(member.id)),
    [members, selectedAssigneeIds],
  )

  if (!open || !task) {
    return null
  }

  const columnTitle = columns.find((column) => column.id === task.columnId)?.title ?? 'Unknown column'

  const togglePendingAssignee = (memberId: string): void => {
    setPendingAssigneeIds((previous) =>
      previous.includes(memberId) ? previous.filter((id) => id !== memberId) : [...previous, memberId],
    )
  }

  const addSelectedAssignees = (): void => {
    if (pendingAssigneeIds.length === 0) {
      setSelectionError('Select at least one user first.')
      return
    }

    setSelectedAssigneeIds((previous) => Array.from(new Set([...previous, ...pendingAssigneeIds])))
    setPendingAssigneeIds([])
    setSelectionError(undefined)
    setIsDropdownOpen(false)
  }

  const removeAssignee = (memberId: string): void => {
    setSelectedAssigneeIds((previous) => previous.filter((id) => id !== memberId))
  }

  const handleSave = async (): Promise<void> => {
    const trimmedTitle = title.trim()
    if (trimmedTitle.length === 0) {
      setTitleError('Task title is required.')
      return
    }

    setTitleError(undefined)
    await onSave(task.id, {
      title: trimmedTitle,
      description: description.trim(),
      priority,
      assigneeIds: selectedAssigneeIds,
    })
    setIsEditing(false)
  }

  const handleCancelEdit = (): void => {
    setTitle(task.title)
    setDescription(task.description)
    setPriority(task.priority)
    setSelectedAssigneeIds(task.assigneeIds)
    setPendingAssigneeIds([])
    setIsDropdownOpen(false)
    setTitleError(undefined)
    setSelectionError(undefined)
    setIsEditing(false)
  }

  const handleDelete = async (): Promise<void> => {
    await onDelete(task.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/60 px-4 py-8">
      <section className="w-full max-w-2xl rounded-modal border border-surface-100 bg-white p-6 shadow-xl dark:border-surface-800 dark:bg-surface-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-500">{columnTitle}</p>
            {!isEditing ? (
              <h2 className="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-50">{task.title}</h2>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button type="button" variant="ghost" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-6 space-y-4">
            <Input
              id="edit-task-title"
              label="Task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              error={titleError}
            />

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-surface-900 dark:text-surface-50">Description</span>
              <textarea
                id="edit-task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Describe what needs to be done..."
                className="w-full rounded-card border border-surface-100 bg-white px-3 py-2 text-surface-900 outline-none transition focus:border-brand-500 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-50"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-surface-900 dark:text-surface-50">Priority</span>
              <select
                id="edit-task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className="w-full rounded-card border border-surface-100 bg-white px-3 py-2 text-surface-900 outline-none transition focus:border-brand-500 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-50"
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {getPriorityLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-surface-900 dark:text-surface-50">Assignees</legend>
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between border border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900"
                  disabled={isLoadingMembers || membersLoadError !== null || availableMembers.length === 0}
                  onClick={() => setIsDropdownOpen((previous) => !previous)}
                >
                  <span>
                    {pendingAssigneeIds.length > 0
                      ? `Selected: ${pendingAssigneeIds.length}`
                      : 'Add board members'}
                  </span>
                  <span aria-hidden="true">{isDropdownOpen ? '▲' : '▼'}</span>
                </Button>

                {isDropdownOpen ? (
                  <div className="absolute z-10 mt-2 max-h-48 w-full overflow-y-auto rounded-card border border-surface-100 bg-white p-2 shadow-lg dark:border-surface-700 dark:bg-surface-900">
                    {availableMembers.map((member) => (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-2 rounded-card p-2 hover:bg-surface-50 dark:hover:bg-surface-800"
                      >
                        <input
                          type="checkbox"
                          checked={pendingAssigneeIds.includes(member.id)}
                          onChange={() => togglePendingAssignee(member.id)}
                          className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="min-w-0 text-sm text-surface-900 dark:text-surface-50">
                          {member.displayName} ({member.email})
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2">
                {membersLoadError ? <p className="text-sm text-danger-500">{membersLoadError}</p> : <span />}
                <Button
                  type="button"
                  onClick={addSelectedAssignees}
                  disabled={isLoadingMembers || membersLoadError !== null || availableMembers.length === 0}
                >
                  Add
                </Button>
              </div>
              {selectionError ? <p className="text-sm text-danger-500">{selectionError}</p> : null}

              <div className="space-y-2 rounded-card border border-surface-100 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-900/40">
                {selectedAssignees.length === 0 ? (
                  <p className="text-sm text-surface-700 dark:text-surface-200">No assignees selected.</p>
                ) : null}
                {selectedAssignees.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-surface-900 dark:text-surface-50">
                      {member.displayName} ({member.email})
                    </span>
                    <Button type="button" variant="ghost" onClick={() => removeAssignee(member.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button type="button" variant="danger" onClick={handleDelete} isLoading={isSaving} disabled={isSaving}>
                Delete task
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-surface-900 dark:text-surface-50">Priority</h3>
              <p className="mt-2 text-sm text-surface-800 dark:text-surface-100">{getPriorityLabel(task.priority)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-surface-900 dark:text-surface-50">Description</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-surface-800 dark:text-surface-100">
                {task.description.trim().length > 0 ? task.description : 'No description provided.'}
              </p>
            </div>

            <div className="rounded-card border border-surface-100 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
              <h3 className="text-sm font-medium text-surface-900 dark:text-surface-50">Assignees</h3>
              {task.assigneeIds.length === 0 ? (
                <p className="mt-2 text-sm text-surface-700 dark:text-surface-200">Not assigned</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {selectedAssignees.length > 0
                    ? selectedAssignees.map((member) => (
                        <li key={member.id} className="text-sm text-surface-900 dark:text-surface-50">
                          {member.displayName} ({member.email})
                        </li>
                      ))
                    : (
                        <li className="text-sm text-surface-900 dark:text-surface-50">{task.assigneeName}</li>
                      )}
                </ul>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="danger" onClick={handleDelete} isLoading={isSaving} disabled={isSaving}>
                Delete task
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
