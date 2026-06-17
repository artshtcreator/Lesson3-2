import {
	getTaskBreakdownErrorMessage,
	processTaskJobMessage,
	runTaskBreakdownAndSave,
} from "./lib/process-task-breakdown";
import { fetchBoardMembers } from "./lib/supabase";
import {
	createPendingTaskJob,
	getTaskJob,
	type TaskJobQueueMessage,
} from "./lib/task-jobs";

interface ChatRequestBody {
	boardId?: string;
	message?: string;
}

interface ParsedChatRequest {
	boardId: string;
	message: string;
}

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapTaskBreakdownErrorToResponse(error: unknown): Response {
	const message = getTaskBreakdownErrorMessage(error);

	if (message.startsWith("OpenRouter request timed out")) {
		return Response.json({ error: message }, { status: 504 });
	}

	if (message.startsWith("OpenRouter")) {
		return Response.json({ error: message }, { status: 502 });
	}

	if (message.startsWith("Supabase")) {
		return Response.json({ error: message }, { status: 502 });
	}

	if (message === "Empty response from OpenRouter") {
		return Response.json({ error: message }, { status: 502 });
	}

	if (message.startsWith("Invalid task breakdown format")) {
		return Response.json({ error: message }, { status: 502 });
	}

	if (message === "Board not found or has no members") {
		return Response.json({ error: message }, { status: 404 });
	}

	if (message === "Board todo column not found") {
		return Response.json({ error: message }, { status: 404 });
	}

	if (message === "Failed to save task to Supabase") {
		return Response.json({ error: message }, { status: 502 });
	}

	return Response.json({ error: message }, { status: 500 });
}

async function parseChatRequest(
	request: Request,
): Promise<ParsedChatRequest | Response> {
	const body = (await request.json()) as ChatRequestBody;
	const message = body.message?.trim();
	const boardId = body.boardId?.trim();

	if (!boardId || !UUID_REGEX.test(boardId)) {
		return Response.json(
			{ error: "boardId is required and must be a valid UUID" },
			{ status: 400 },
		);
	}

	if (!message) {
		return Response.json(
			{ error: "message is required and must be a non-empty string" },
			{ status: 400 },
		);
	}

	return { boardId, message };
}

function ensureSupabaseConfigured(env: Env): Response | null {
	if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
		return Response.json(
			{ error: "Supabase is not configured" },
			{ status: 500 },
		);
	}

	return null;
}

async function loadBoardMembers(
	env: Env,
	boardId: string,
): Promise<Response | Awaited<ReturnType<typeof fetchBoardMembers>>> {
	try {
		const members = await fetchBoardMembers(
			env.SUPABASE_URL,
			env.SUPABASE_SERVICE_ROLE_KEY,
			boardId,
		);

		if (members.length === 0) {
			return Response.json(
				{ error: "Board not found or has no members" },
				{ status: 404 },
			);
		}

		return members;
	} catch (error) {
		return mapTaskBreakdownErrorToResponse(error);
	}
}

async function handleChat(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		const parsedOrResponse = await parseChatRequest(request);
		if (parsedOrResponse instanceof Response) {
			return parsedOrResponse;
		}

		if (!env.OPENROUTER_API_KEY) {
			return Response.json(
				{ error: "OPENROUTER_API_KEY is not configured" },
				{ status: 500 },
			);
		}

		const supabaseError = ensureSupabaseConfigured(env);
		if (supabaseError) {
			return supabaseError;
		}

		const membersOrResponse = await loadBoardMembers(
			env,
			parsedOrResponse.boardId,
		);
		if (membersOrResponse instanceof Response) {
			return membersOrResponse;
		}

		const tasks = await runTaskBreakdownAndSave(
			env.OPENROUTER_API_KEY,
			env.SUPABASE_URL,
			env.SUPABASE_SERVICE_ROLE_KEY,
			parsedOrResponse.boardId,
			parsedOrResponse.message,
			membersOrResponse,
		);
		return Response.json(tasks);
	} catch (error) {
		return mapTaskBreakdownErrorToResponse(error);
	}
}

async function handleCreateChatJob(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		const parsedOrResponse = await parseChatRequest(request);
		if (parsedOrResponse instanceof Response) {
			return parsedOrResponse;
		}

		if (!env.OPENROUTER_API_KEY) {
			return Response.json(
				{ error: "OPENROUTER_API_KEY is not configured" },
				{ status: 500 },
			);
		}

		const supabaseError = ensureSupabaseConfigured(env);
		if (supabaseError) {
			return supabaseError;
		}

		if (!env.TASK_QUEUE) {
			return Response.json(
				{ error: "TASK_QUEUE is not configured" },
				{ status: 500 },
			);
		}

		if (!env.TASK_JOBS) {
			return Response.json(
				{ error: "TASK_JOBS is not configured" },
				{ status: 500 },
			);
		}

		const membersOrResponse = await loadBoardMembers(
			env,
			parsedOrResponse.boardId,
		);
		if (membersOrResponse instanceof Response) {
			return membersOrResponse;
		}

		const job = await createPendingTaskJob(env.TASK_JOBS);
		const payload: TaskJobQueueMessage = {
			jobId: job.id,
			message: parsedOrResponse.message,
			boardId: parsedOrResponse.boardId,
		};
		await env.TASK_QUEUE.send(payload);

		return Response.json(
			{
				jobId: job.id,
				status: job.status,
				pollUrl: `/api/chat/jobs/${job.id}`,
			},
			{ status: 202 },
		);
	} catch (error) {
		return mapTaskBreakdownErrorToResponse(error);
	}
}

async function handleGetChatJob(env: Env, jobId: string): Promise<Response> {
	const job = await getTaskJob(env.TASK_JOBS, jobId);
	if (!job) {
		return Response.json({ error: "Job not found" }, { status: 404 });
	}

	if (job.status === "completed") {
		return Response.json({
			jobId: job.id,
			status: job.status,
			tasks: job.tasks,
		});
	}

	if (job.status === "failed") {
		return Response.json(
			{
				jobId: job.id,
				status: job.status,
				error: job.error ?? "Task breakdown failed",
			},
			{ status: 502 },
		);
	}

	return Response.json(
		{
			jobId: job.id,
			status: job.status,
		},
		{ status: 202 },
	);
}

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/test" && request.method === "GET") {
			return new Response("тест пройден");
		}

		if (url.pathname === "/api/chat" && request.method === "POST") {
			return handleChat(request, env);
		}

		if (url.pathname === "/api/chat/jobs" && request.method === "POST") {
			return handleCreateChatJob(request, env);
		}

		const jobMatch = url.pathname.match(/^\/api\/chat\/jobs\/([^/]+)$/);
		if (jobMatch && request.method === "GET") {
			return handleGetChatJob(env, jobMatch[1]);
		}

		return new Response("Not Found", { status: 404 });
	},

	async queue(batch, env): Promise<void> {
		for (const message of batch.messages) {
			const payload = message.body as TaskJobQueueMessage;
			await processTaskJobMessage(env, payload);
			message.ack();
		}
	},
} satisfies ExportedHandler<Env, TaskJobQueueMessage>;
