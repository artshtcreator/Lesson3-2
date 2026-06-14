import { supabase } from '@/lib/supabase'
import { buildAssigneeDisplay } from '@/features/board/utils/assignees'
import type { BoardMemberOption, BoardState, TaskPriority, UpdateTaskPayload } from '@/types/board'

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

export const listBoardMembers = async (boardId: string): Promise<BoardMemberOption[]> => {
  const { data: members, error: membersError } = await supabase
    .from('board_members')
    .select('user_id')
    .eq('board_id', boardId)

  if (membersError) {
    throw new Error(membersError.message)
  }

  const userIds = (members ?? []).map((member) => member.user_id)
  if (userIds.length === 0) {
    return []
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,email,full_name,role')
    .in('id', userIds)
    .order('email', { ascending: true })

  if (profilesError) {
    throw new Error(profilesError.message)
  }

  return (profiles ?? []).map(mapProfileToOption)
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
  priority: TaskPriority
  assignee_id: string | null
}

const loadTaskAssignees = async (taskIds: string[]): Promise<Record<string, BoardMemberOption[]>> => {
  if (taskIds.length === 0) {
    return {}
  }

  const { data: links, error: linksError } = await supabase
    .from('board_task_assignees')
    .select('task_id,user_id')
    .in('task_id', taskIds)

  if (linksError) {
    throw new Error(linksError.message)
  }

  const userIds = Array.from(new Set((links ?? []).map((link) => link.user_id)))
  if (userIds.length === 0) {
    return {}
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,email,full_name,role')
    .in('id', userIds)

  if (profilesError) {
    throw new Error(profilesError.message)
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, mapProfileToOption(profile)]))
  const assigneesByTask: Record<string, BoardMemberOption[]> = {}

  for (const link of links ?? []) {
    const profile = profilesById.get(link.user_id)
    if (!profile) {
      continue
    }

    assigneesByTask[link.task_id] = assigneesByTask[link.task_id] ?? []
    assigneesByTask[link.task_id].push(profile)
  }

  return assigneesByTask
}

const syncTaskAssignees = async (taskId: string, assigneeIds: string[]): Promise<void> => {
  const { error: deleteError } = await supabase.from('board_task_assignees').delete().eq('task_id', taskId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (assigneeIds.length === 0) {
    return
  }

  const { error: insertError } = await supabase.from('board_task_assignees').insert(
    assigneeIds.map((userId) => ({
      task_id: taskId,
      user_id: userId,
    })),
  )

  if (insertError) {
    throw new Error(insertError.message)
  }
}

export const getBoardKanbanState = async (boardId: string): Promise<BoardState> => {
  const [{ data: columns, error: columnsError }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase.from('board_columns').select('id,title,position').eq('board_id', boardId).order('position', { ascending: true }),
    supabase
      .from('board_tasks')
      .select('id,title,description,column_id,position,priority,assignee_id')
      .eq('board_id', boardId)
      .order('position', { ascending: true }),
  ])

  if (columnsError) {
    throw new Error(columnsError.message)
  }

  if (tasksError) {
    throw new Error(tasksError.message)
  }

  const taskRows = (tasks ?? []) as BoardTaskRow[]
  const assigneesByTask = await loadTaskAssignees(taskRows.map((task) => task.id))

  return {
    columns: (columns ?? []).map((column) => ({
      id: column.id,
      title: column.title,
      position: column.position,
    })),
    cards: taskRows.map((task) => {
      const assignees = assigneesByTask[task.id] ?? []
      const assigneeDisplay = buildAssigneeDisplay(assignees)

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        columnId: task.column_id,
        priority: task.priority,
        ...assigneeDisplay,
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

const POSITION_GAP = 1024

export const createBoardTask = async (
  boardId: string,
  payload: { title: string; description: string; assigneeId: string | null },
): Promise<string> => {
  const trimmedTitle = payload.title.trim()
  if (trimmedTitle.length === 0) {
    throw new Error('Task title is required.')
  }

  const { data: todoColumn, error: columnError } = await supabase
    .from('board_columns')
    .select('id')
    .eq('board_id', boardId)
    .eq('slug', 'todo')
    .single()

  if (columnError) {
    throw new Error(columnError.message)
  }

  const { data: existingTasks, error: tasksError } = await supabase
    .from('board_tasks')
    .select('position')
    .eq('board_id', boardId)
    .eq('column_id', todoColumn.id)
    .order('position', { ascending: false })
    .limit(1)

  if (tasksError) {
    throw new Error(tasksError.message)
  }

  const nextPosition = (existingTasks?.[0]?.position ?? 0) + POSITION_GAP
  const assigneeIds = payload.assigneeId ? [payload.assigneeId] : []

  const { data, error } = await supabase
    .from('board_tasks')
    .insert({
      board_id: boardId,
      column_id: todoColumn.id,
      title: trimmedTitle,
      description: payload.description.trim(),
      assignee_id: payload.assigneeId,
      priority: 'medium',
      position: nextPosition,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await syncTaskAssignees(data.id as string, assigneeIds)

  return data.id as string
}

export const updateBoardTask = async (taskId: string, payload: UpdateTaskPayload): Promise<void> => {
  const trimmedTitle = payload.title.trim()
  if (trimmedTitle.length === 0) {
    throw new Error('Task title is required.')
  }

  const { error: updateError } = await supabase
    .from('board_tasks')
    .update({
      title: trimmedTitle,
      description: payload.description.trim(),
      priority: payload.priority,
      assignee_id: payload.assigneeIds[0] ?? null,
    })
    .eq('id', taskId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  await syncTaskAssignees(taskId, payload.assigneeIds)
}

export const deleteBoardTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase.from('board_tasks').delete().eq('id', taskId)

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
