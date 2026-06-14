export interface BoardColumn {
  id: string
  title: string
  position: number
}

export interface BoardCard {
  id: string
  title: string
  description: string
  columnId: string
  assigneeId: string | null
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
