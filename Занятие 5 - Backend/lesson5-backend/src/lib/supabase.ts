import type { TaskItem } from "./task-breakdown";

export interface BoardMember {
	id: string;
	email: string;
	displayName: string;
	role: string | null;
}

interface BoardMemberRow {
	user_id: string;
	profiles: {
		id: string;
		email: string;
		full_name: string | null;
		role: string | null;
	} | null;
}

interface BoardColumnRow {
	id: string;
}

interface BoardTaskPositionRow {
	position: number;
}

interface InsertedBoardTaskRow {
	id: string;
}

const POSITION_GAP = 1024;

function supabaseHeaders(
	serviceRoleKey: string,
	prefer?: string,
): HeadersInit {
	const headers: Record<string, string> = {
		apikey: serviceRoleKey,
		Authorization: `Bearer ${serviceRoleKey}`,
		"Content-Type": "application/json",
	};

	if (prefer) {
		headers.Prefer = prefer;
	}

	return headers;
}

function mapProfileToMember(profile: {
	id: string;
	email: string;
	full_name: string | null;
	role: string | null;
}): BoardMember {
	return {
		id: profile.id,
		email: profile.email,
		displayName: profile.full_name?.trim() || profile.email,
		role: profile.role,
	};
}

async function supabaseRequest<T>(
	supabaseUrl: string,
	serviceRoleKey: string,
	path: string,
	searchParams: Record<string, string>,
	init?: RequestInit,
): Promise<T> {
	const url = new URL(path, supabaseUrl);
	for (const [key, value] of Object.entries(searchParams)) {
		url.searchParams.set(key, value);
	}

	const response = await fetch(url.toString(), {
		...init,
		headers: {
			...supabaseHeaders(serviceRoleKey, init?.method === "POST" ? "return=representation" : undefined),
			...(init?.headers ?? {}),
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Supabase ${response.status}: ${errorText}`);
	}

	if (response.status === 204) {
		return [] as T;
	}

	return (await response.json()) as T;
}

export async function fetchBoardMembers(
	supabaseUrl: string,
	serviceRoleKey: string,
	boardId: string,
): Promise<BoardMember[]> {
	const rows = await supabaseRequest<BoardMemberRow[]>(
		supabaseUrl,
		serviceRoleKey,
		"/rest/v1/board_members",
		{
			board_id: `eq.${boardId}`,
			select: "user_id,profiles(id,email,full_name,role)",
		},
	);

	return rows
		.map((row) => row.profiles)
		.filter((profile): profile is NonNullable<typeof profile> => profile !== null)
		.map(mapProfileToMember);
}

async function getTodoColumnId(
	supabaseUrl: string,
	serviceRoleKey: string,
	boardId: string,
): Promise<string> {
	const rows = await supabaseRequest<BoardColumnRow[]>(
		supabaseUrl,
		serviceRoleKey,
		"/rest/v1/board_columns",
		{
			board_id: `eq.${boardId}`,
			slug: "eq.todo",
			select: "id",
		},
	);

	const columnId = rows[0]?.id;
	if (!columnId) {
		throw new Error("Board todo column not found");
	}

	return columnId;
}

async function getNextTaskPosition(
	supabaseUrl: string,
	serviceRoleKey: string,
	boardId: string,
	columnId: string,
): Promise<number> {
	const rows = await supabaseRequest<BoardTaskPositionRow[]>(
		supabaseUrl,
		serviceRoleKey,
		"/rest/v1/board_tasks",
		{
			board_id: `eq.${boardId}`,
			column_id: `eq.${columnId}`,
			select: "position",
			order: "position.desc",
			limit: "1",
		},
	);

	return (rows[0]?.position ?? 0) + POSITION_GAP;
}

export async function saveBoardTasks(
	supabaseUrl: string,
	serviceRoleKey: string,
	boardId: string,
	tasks: TaskItem[],
): Promise<TaskItem[]> {
	if (tasks.length === 0) {
		return [];
	}

	const columnId = await getTodoColumnId(supabaseUrl, serviceRoleKey, boardId);
	let nextPosition = await getNextTaskPosition(
		supabaseUrl,
		serviceRoleKey,
		boardId,
		columnId,
	);

	const savedTasks: TaskItem[] = [];

	for (const task of tasks) {
		const insertedRows = await supabaseRequest<InsertedBoardTaskRow[]>(
			supabaseUrl,
			serviceRoleKey,
			"/rest/v1/board_tasks",
			{},
			{
				method: "POST",
				body: JSON.stringify({
					board_id: boardId,
					column_id: columnId,
					title: task.task,
					description: "",
					assignee_id: task.assigneeId,
					priority: "medium",
					position: nextPosition,
				}),
			},
		);

		const taskId = insertedRows[0]?.id;
		if (!taskId) {
			throw new Error("Failed to save task to Supabase");
		}

		await supabaseRequest<unknown[]>(
			supabaseUrl,
			serviceRoleKey,
			"/rest/v1/board_task_assignees",
			{},
			{
				method: "POST",
				body: JSON.stringify({
					task_id: taskId,
					user_id: task.assigneeId,
				}),
			},
		);

		savedTasks.push({
			...task,
			id: taskId,
		});
		nextPosition += POSITION_GAP;
	}

	return savedTasks;
}
