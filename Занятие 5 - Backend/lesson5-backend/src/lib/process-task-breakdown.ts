import { chatWithDeepSeek } from "./openrouter";
import type { BoardMember } from "./supabase";
import { fetchBoardMembers, saveBoardTasks } from "./supabase";
import {
	parseAssignedTaskBreakdown,
	type TaskItem,
} from "./task-breakdown";
import {
	updateTaskJob,
	type TaskJobQueueMessage,
} from "./task-jobs";

export async function runTaskBreakdown(
	apiKey: string,
	message: string,
	members: BoardMember[],
): Promise<TaskItem[]> {
	const reply = await chatWithDeepSeek(apiKey, message, members);
	return parseAssignedTaskBreakdown(reply, members);
}

export async function runTaskBreakdownAndSave(
	apiKey: string,
	supabaseUrl: string,
	serviceRoleKey: string,
	boardId: string,
	message: string,
	members: BoardMember[],
): Promise<TaskItem[]> {
	const tasks = await runTaskBreakdown(apiKey, message, members);
	return saveBoardTasks(supabaseUrl, serviceRoleKey, boardId, tasks);
}

export function getTaskBreakdownErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Unknown error";
}

export async function processTaskJobMessage(
	env: Env,
	payload: TaskJobQueueMessage,
): Promise<void> {
	const { jobId, message, boardId } = payload;

	await updateTaskJob(env.TASK_JOBS, jobId, { status: "processing" });

	try {
		if (!env.OPENROUTER_API_KEY) {
			throw new Error("OPENROUTER_API_KEY is not configured");
		}

		if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
			throw new Error("Supabase is not configured");
		}

		const members = await fetchBoardMembers(
			env.SUPABASE_URL,
			env.SUPABASE_SERVICE_ROLE_KEY,
			boardId,
		);

		if (members.length === 0) {
			throw new Error("Board not found or has no members");
		}

		const tasks = await runTaskBreakdownAndSave(
			env.OPENROUTER_API_KEY,
			env.SUPABASE_URL,
			env.SUPABASE_SERVICE_ROLE_KEY,
			boardId,
			message,
			members,
		);
		await updateTaskJob(env.TASK_JOBS, jobId, {
			status: "completed",
			tasks,
		});
	} catch (error) {
		await updateTaskJob(env.TASK_JOBS, jobId, {
			status: "failed",
			error: getTaskBreakdownErrorMessage(error),
		});
	}
}
