import { supabase } from '@/lib/supabase'
import type { BoardMemberOption, BoardState } from '@/types/board'

const mapProfileToOption = (profile: {
  id: string
  email: string
  full_name: string | null
  role: string | null
}): BoardMemberOption => ({
  id: profile.id,
  email: profile.email,
  displayName: profile.full_name?.trim() || profile.email,
  role: profile.role,
})

export const listBoardUsers = async (): Promise<BoardMemberOption[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,role')
    .order('email', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapProfileToOption)
}

export interface BoardSummary {
  id: string
  name: string
  createdAt: string
}

export const listBoards = async (): Promise<BoardSummary[]> => {
  const { data, error } = await supabase.from('boards').select('id,name,created_at').order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((board) => ({
    id: board.id,
    name: board.name,
    createdAt: board.created_at,
  }))
}

export const getBoardById = async (boardId: string): Promise<BoardSummary> => {
  const { data, error } = await supabase.from('boards').select('id,name,created_at').eq('id', boardId).single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
  }
}

interface BoardTaskRow {
  id: string
  title: string
  description: string
  column_id: string
  position: number
  assignee_id: string | null
  profiles:
    | {
        email: string
        full_name: string | null
      }
    | {
        email: string
        full_name: string | null
      }[]
    | null
}

const getAssigneeProfile = (
  profiles: BoardTaskRow['profiles'],
): { email: string; full_name: string | null } | null => {
  if (!profiles) {
    return null
  }

  return Array.isArray(profiles) ? profiles[0] ?? null : profiles
}

export const getBoardKanbanState = async (boardId: string): Promise<BoardState> => {
  const [{ data: columns, error: columnsError }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase.from('board_columns').select('id,title,position').eq('board_id', boardId).order('position', { ascending: true }),
    supabase
      .from('board_tasks')
      .select('id,title,description,column_id,position,assignee_id,profiles:assignee_id(email,full_name)')
      .eq('board_id', boardId)
      .order('position', { ascending: true }),
  ])

  if (columnsError) {
    throw new Error(columnsError.message)
  }

  if (tasksError) {
    throw new Error(tasksError.message)
  }

  return {
    columns: (columns ?? []).map((column) => ({
      id: column.id,
      title: column.title,
      position: column.position,
    })),
    cards: ((tasks ?? []) as BoardTaskRow[]).map((task) => {
      const assigneeProfile = getAssigneeProfile(task.profiles)

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        columnId: task.column_id,
        assigneeId: task.assignee_id,
        assigneeName: assigneeProfile?.full_name?.trim() || assigneeProfile?.email || 'Unassigned',
        assigneeEmail: assigneeProfile?.email ?? null,
        position: task.position,
      }
    }),
  }
}

export const moveBoardTask = async (taskId: string, columnId: string, position: number): Promise<void> => {
  const { error } = await supabase.from('board_tasks').update({ column_id: columnId, position }).eq('id', taskId)

  if (error) {
    throw new Error(error.message)
  }
}

export const createBoardWithMembers = async (name: string, memberIds: string[]): Promise<string> => {
  const trimmedName = name.trim()
  if (trimmedName.length === 0) {
    throw new Error('Board name is required.')
  }

  const { data, error } = await supabase.rpc('create_board_with_members', {
    p_name: trimmedName,
    p_member_ids: memberIds,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as string
}