import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import worker from "../src/index";
import { processTaskJobMessage } from "../src/lib/process-task-breakdown";
import { getTaskJob, saveTaskJob } from "../src/lib/task-jobs";

const BOARD_ID = "33333333-3333-3333-3333-333333333333";
const ASSIGNEE_ID = "11111111-1111-1111-1111-111111111111";

const mockMembersResponse = [
	{
		user_id: ASSIGNEE_ID,
		profiles: {
			id: ASSIGNEE_ID,
			email: "dev@example.com",
			full_name: "Developer",
			role: "Backend Developer",
		},
	},
];

const mockTaskQueue = {
	send: vi.fn().mockResolvedValue(undefined),
};

const kvStore = new Map<string, string>();

const mockTaskJobs = {
	get: vi.fn(async (key: string) => kvStore.get(key) ?? null),
	put: vi.fn(async (key: string, value: string) => {
		kvStore.set(key, value);
	}),
} as unknown as KVNamespace;

const mockEnv = {
	OPENROUTER_API_KEY: "test-key",
	SUPABASE_URL: "https://example.supabase.co",
	SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
	TASK_QUEUE: mockTaskQueue,
	TASK_JOBS: mockTaskJobs,
} as Env;

const mockCtx = {
	waitUntil: () => {},
	passThroughOnException: () => {},
} as ExecutionContext;

const TODO_COLUMN_ID = "44444444-4444-4444-4444-444444444444";
let nextTaskId = 1;

function mockSupabaseAndOpenRouter(
	openRouterContent: string,
	members: typeof mockMembersResponse = mockMembersResponse,
): void {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";

			if (url.includes("example.supabase.co/rest/v1/board_members")) {
				return Promise.resolve(
					new Response(JSON.stringify(members), { status: 200 }),
				);
			}

			if (url.includes("example.supabase.co/rest/v1/board_columns")) {
				return Promise.resolve(
					new Response(JSON.stringify([{ id: TODO_COLUMN_ID }]), {
						status: 200,
					}),
				);
			}

			if (
				url.includes("example.supabase.co/rest/v1/board_tasks") &&
				method === "GET"
			) {
				return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
			}

			if (
				url.includes("example.supabase.co/rest/v1/board_tasks") &&
				method === "POST"
			) {
				const taskId = `task-${nextTaskId++}`;
				return Promise.resolve(
					new Response(JSON.stringify([{ id: taskId }]), { status: 201 }),
				);
			}

			if (url.includes("example.supabase.co/rest/v1/board_task_assignees")) {
				return Promise.resolve(new Response(JSON.stringify([]), { status: 201 }));
			}

			if (url.includes("openrouter.ai")) {
				return Promise.resolve(
					new Response(
						JSON.stringify({
							choices: [{ message: { content: openRouterContent } }],
						}),
						{ status: 200 },
					),
				);
			}

			return Promise.resolve(new Response("Not Found", { status: 404 }));
		}),
	);
}

beforeEach(() => {
	kvStore.clear();
	mockTaskQueue.send.mockClear();
	nextTaskId = 1;
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("worker routes", () => {
	it("responds with 404 for unknown routes", async () => {
		const request = new Request("http://example.com");
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Not Found");
	});

	it("responds on GET /test", async () => {
		const request = new Request("http://example.com/test");
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("тест пройден");
	});
});

describe("POST /api/chat", () => {
	it("returns 400 when boardId is missing", async () => {
		const request = new Request("http://example.com/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: "Split this task" }),
		});
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body).toEqual({
			error: "boardId is required and must be a valid UUID",
		});
	});

	it("returns 400 when message is missing", async () => {
		const request = new Request("http://example.com/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ boardId: BOARD_ID }),
		});
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body).toEqual({
			error: "message is required and must be a non-empty string",
		});
	});

	it("returns 404 when board has no members", async () => {
		mockSupabaseAndOpenRouter("[]", []);

		const request = new Request("http://example.com/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				boardId: BOARD_ID,
				message: "Split this task",
			}),
		});
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body).toEqual({
			error: "Board not found or has no members",
		});
	});

	it("returns assigned task array when LLM output is valid", async () => {
		mockSupabaseAndOpenRouter(
			JSON.stringify([
				{ task: "Create API route", assigneeId: ASSIGNEE_ID },
				{ task: "Add tests", assigneeId: ASSIGNEE_ID },
			]),
		);

		const request = new Request("http://example.com/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				boardId: BOARD_ID,
				message: "Сделай backend для Kanban и покрой тестами",
			}),
		});
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual([
			{
				id: "task-1",
				task: "Create API route",
				assigneeId: ASSIGNEE_ID,
				assigneeName: "Developer",
				assigneeEmail: "dev@example.com",
				assigneeRole: "Backend Developer",
			},
			{
				id: "task-2",
				task: "Add tests",
				assigneeId: ASSIGNEE_ID,
				assigneeName: "Developer",
				assigneeEmail: "dev@example.com",
				assigneeRole: "Backend Developer",
			},
		]);
	});

	it("returns 502 when LLM output is not valid JSON array", async () => {
		mockSupabaseAndOpenRouter("not-json");

		const request = new Request("http://example.com/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				boardId: BOARD_ID,
				message: "Разбей большую задачу",
			}),
		});
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body).toEqual({
			error: "Invalid task breakdown format: response is not valid JSON",
		});
	});

	it("returns 502 when assigneeId is not a board member", async () => {
		mockSupabaseAndOpenRouter(
			JSON.stringify([
				{
					task: "Create API route",
					assigneeId: "99999999-9999-9999-9999-999999999999",
				},
			]),
		);

		const request = new Request("http://example.com/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				boardId: BOARD_ID,
				message: "Разбей большую задачу",
			}),
		});
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body).toEqual({
			error:
				"Invalid task breakdown format: assigneeId at index 0 is not a board member",
		});
	});

	it("returns 504 when OpenRouter request times out", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockImplementation((input: RequestInfo | URL) => {
				const url = String(input);

				if (url.includes("example.supabase.co")) {
					return Promise.resolve(
						new Response(JSON.stringify(mockMembersResponse), {
							status: 200,
						}),
					);
				}

				return Promise.reject(
					new DOMException("The operation timed out.", "TimeoutError"),
				);
			}),
		);

		const request = new Request("http://example.com/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				boardId: BOARD_ID,
				message: "Разбей большую задачу",
			}),
		});
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(504);
		const body = await response.json();
		expect(body.error).toMatch(/^OpenRouter request timed out after \d+ms$/);
	});
});

describe("POST /api/chat/jobs", () => {
	it("returns 202 immediately with jobId", async () => {
		mockSupabaseAndOpenRouter("[]");

		const request = new Request("http://example.com/api/chat/jobs", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				boardId: BOARD_ID,
				message: "Разбей большую задачу на подзадачи",
			}),
		});
		const response = await worker.fetch(request, mockEnv, mockCtx);

		expect(response.status).toBe(202);
		const body = (await response.json()) as {
			jobId: string;
			status: string;
			pollUrl: string;
		};
		expect(body.status).toBe("pending");
		expect(body.jobId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
		expect(body.pollUrl).toBe(`/api/chat/jobs/${body.jobId}`);
		expect(mockTaskQueue.send).toHaveBeenCalledWith({
			jobId: body.jobId,
			message: "Разбей большую задачу на подзадачи",
			boardId: BOARD_ID,
		});
	});
});

describe("GET /api/chat/jobs/:jobId", () => {
	it("returns 202 while job is pending", async () => {
		await saveTaskJob(mockTaskJobs, {
			id: "job-1",
			status: "pending",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		});

		const response = await worker.fetch(
			new Request("http://example.com/api/chat/jobs/job-1"),
			mockEnv,
			mockCtx,
		);

		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({
			jobId: "job-1",
			status: "pending",
		});
	});

	it("returns completed tasks when job is done", async () => {
		await saveTaskJob(mockTaskJobs, {
			id: "job-2",
			status: "completed",
			tasks: [
				{
					task: "Write tests",
					assigneeId: ASSIGNEE_ID,
					assigneeName: "Developer",
					assigneeEmail: "dev@example.com",
					assigneeRole: "Backend Developer",
				},
			],
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:01.000Z",
		});

		const response = await worker.fetch(
			new Request("http://example.com/api/chat/jobs/job-2"),
			mockEnv,
			mockCtx,
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			jobId: "job-2",
			status: "completed",
			tasks: [
				{
					task: "Write tests",
					assigneeId: ASSIGNEE_ID,
					assigneeName: "Developer",
					assigneeEmail: "dev@example.com",
					assigneeRole: "Backend Developer",
				},
			],
		});
	});
});

describe("queue consumer", () => {
	it("processes queued job and stores completed tasks", async () => {
		mockSupabaseAndOpenRouter(
			JSON.stringify([
				{ task: "Setup queue", assigneeId: ASSIGNEE_ID },
			]),
		);

		await saveTaskJob(mockTaskJobs, {
			id: "job-3",
			status: "pending",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		});

		await processTaskJobMessage(mockEnv, {
			jobId: "job-3",
			message: "Разбей задачу",
			boardId: BOARD_ID,
		});

		const job = await getTaskJob(mockTaskJobs, "job-3");
		expect(job?.status).toBe("completed");
		expect(job?.tasks).toEqual([
			{
				id: "task-1",
				task: "Setup queue",
				assigneeId: ASSIGNEE_ID,
				assigneeName: "Developer",
				assigneeEmail: "dev@example.com",
				assigneeRole: "Backend Developer",
			},
		]);
	});
});
