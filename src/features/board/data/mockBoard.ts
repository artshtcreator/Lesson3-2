import type { BoardState } from '@/types/board'

export const mockBoardState: BoardState = {
  columns: [
    { id: 'todo', title: 'To Do', position: 1024 },
    { id: 'in-progress', title: 'In Progress', position: 2048 },
    { id: 'done', title: 'Done', position: 3072 },
  ],
  cards: [
    {
      id: 'card-1',
      title: 'Design auth screen',
      description: 'Create login form with email and password validation.',
      columnId: 'todo',
      assigneeId: null,
      assigneeName: 'Alex',
      assigneeEmail: null,
      position: 1024,
    },
    {
      id: 'card-2',
      title: 'Implement ProtectedRoute',
      description: 'Redirect anonymous users to login page.',
      columnId: 'todo',
      assigneeId: null,
      assigneeName: 'Maria',
      assigneeEmail: null,
      position: 2048,
    },
    {
      id: 'card-3',
      title: 'Configure dnd-kit',
      description: 'Enable keyboard and pointer drag and drop for cards.',
      columnId: 'in-progress',
      assigneeId: null,
      assigneeName: 'Ivan',
      assigneeEmail: null,
      position: 1024,
    },
    {
      id: 'card-4',
      title: 'Project bootstrap',
      description: 'Set up Vite, TypeScript, Tailwind and routing.',
      columnId: 'done',
      assigneeId: null,
      assigneeName: 'Nina',
      assigneeEmail: null,
      position: 1024,
    },
  ],
}
