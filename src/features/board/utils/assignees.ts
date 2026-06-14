import type { BoardMemberOption } from '@/types/board'

export const buildAssigneeDisplay = (
  assignees: BoardMemberOption[],
): {
  assigneeId: string | null
  assigneeIds: string[]
  assigneeName: string
  assigneeEmail: string | null
} => ({
  assigneeId: assignees[0]?.id ?? null,
  assigneeIds: assignees.map((assignee) => assignee.id),
  assigneeName: assignees.length > 0 ? assignees.map((assignee) => assignee.displayName).join(', ') : 'Unassigned',
  assigneeEmail: assignees.length > 0 ? assignees.map((assignee) => assignee.email).join(', ') : null,
})
