import type { BoardMember } from "./supabase";

export interface TaskItem {
	id?: string;
	task: string;
	assigneeId: string;
	assigneeName: string;
	assigneeEmail: string;
	assigneeRole: string | null;
}

interface RawAssignedTask {
	task: string;
	assigneeId: string;
}

function stripMarkdownFences(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed.startsWith("```")) {
		return trimmed;
	}

	const withoutOpening = trimmed.replace(/^```(?:json)?\s*/i, "");
	return withoutOpening.replace(/\s*```$/, "").trim();
}

export function enrichTasksWithAssignees(
	tasks: RawAssignedTask[],
	members: BoardMember[],
): TaskItem[] {
	const membersById = new Map(members.map((member) => [member.id, member]));

	return tasks.map((item, index) => {
		const assignee = membersById.get(item.assigneeId);
		if (!assignee) {
			throw new Error(
				`Invalid task breakdown format: assigneeId at index ${index} is not a board member`,
			);
		}

		return {
			task: item.task,
			assigneeId: assignee.id,
			assigneeName: assignee.displayName,
			assigneeEmail: assignee.email,
			assigneeRole: assignee.role,
		};
	});
}

export function parseAssignedTaskBreakdown(
	raw: string,
	members: BoardMember[],
): TaskItem[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stripMarkdownFences(raw));
	} catch {
		throw new Error("Invalid task breakdown format: response is not valid JSON");
	}

	if (!Array.isArray(parsed)) {
		throw new Error(
			"Invalid task breakdown format: response must be an array",
		);
	}

	const tasks = parsed.map((item, index) => {
		if (typeof item !== "object" || item === null || Array.isArray(item)) {
			throw new Error(
				`Invalid task breakdown format: item at index ${index} must be an object`,
			);
		}

		const taskValue = (item as { task?: unknown }).task;
		if (typeof taskValue !== "string" || taskValue.trim().length === 0) {
			throw new Error(
				`Invalid task breakdown format: item at index ${index} must contain a non-empty task string`,
			);
		}

		const assigneeId = (item as { assigneeId?: unknown }).assigneeId;
		if (typeof assigneeId !== "string" || assigneeId.trim().length === 0) {
			throw new Error(
				`Invalid task breakdown format: item at index ${index} must contain a non-empty assigneeId string`,
			);
		}

		return {
			task: taskValue.trim(),
			assigneeId: assigneeId.trim(),
		};
	});

	return enrichTasksWithAssignees(tasks, members);
}
