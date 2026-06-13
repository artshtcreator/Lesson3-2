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
  assigneeName: string
  position: number
}

export interface BoardState {
  columns: BoardColumn[]
  cards: BoardCard[]
}
