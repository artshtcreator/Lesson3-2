export interface BoardColumn {
  id: string
  title: string
  position: number
}

export type TaskPriority = 'low' | 'medium' | 'high'

export interface BoardCard {
  id: string
  title: string
  description: string
  columnId: string
  priority: TaskPriority
  assigneeId: string | null
  assigneeIds: string[]
  assigneeName: string
  assigneeEmail: string | null
  position: number
}

export interface BoardState {
  columns: BoardColumn[]
  cards: BoardCard[]
}

export interface BoardMemberOption {
  id: string
  email: string
  displayName: string
  role: string | null
}

export interface CreateBoardPayload {
  name: string
  memberIds: string[]
}

export interface CreateTaskPayload {
  title: string
  description: string
  assigneeId: string | null
}

export interface UpdateTaskPayload {
  title: string
  description: string
  priority: TaskPriority
  assigneeIds: string[]
}
