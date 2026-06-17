import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchBoardMembers, saveBoardTasks } from "../src/lib/supabase";
import {
	enrichTasksWithAssignees,
	parseAssignedTaskBreakdown,
} from "../src/lib/task-breakdown";
import type { BoardMember } from "../src/lib/supabase";

const mockMembers: BoardMember[] = [
	{
		id: "11111111-1111-1111-1111-111111111111",
		email: "dev@example.com",
		displayName: "Developer",
		role: "Backend Developer",
	},
	{
		id: "22222222-2222-2222-2222-222222222222",
		email: "pm@example.com",
		displayName: "pm@example.com",
		role: "Product Manager",
	},
];

describe("parseAssignedTaskBreakdown", () => {
	it("parses and enriches tasks with assignee info", () => {
		const raw = JSON.stringify([
			{
				task: "Create API route",
				assigneeId: "11111111-1111-1111-1111-111111111111",
			},
			{
				task: "Write product spec",
				assigneeId: "22222222-2222-2222-2222-222222222222",
			},
		]);

		expect(parseAssignedTaskBreakdown(raw, mockMembers)).toEqual([
			{
				task: "Create API route",
				assigneeId: "11111111-1111-1111-1111-111111111111",
				assigneeName: "Developer",
				assigneeEmail: "dev@example.com",
				assigneeRole: "Backend Developer",
			},
			{
				task: "Write product spec",
				assigneeId: "22222222-2222-2222-2222-222222222222",
				assigneeName: "pm@example.com",
				assigneeEmail: "pm@example.com",
				assigneeRole: "Product Manager",
			},
		]);
	});

	it("throws when assigneeId is not a board member", () => {
		const raw = JSON.stringify([
			{
				task: "Create API route",
				assigneeId: "99999999-9999-9999-9999-999999999999",
			},
		]);

		expect(() => parseAssignedTaskBreakdown(raw, mockMembers)).toThrow(
			"Invalid task breakdown format: assigneeId at index 0 is not a board member",
		);
	});
});

describe("enrichTasksWithAssignees", () => {
	it("maps assignee fields from members", () => {
		expect(
			enrichTasksWithAssignees(
				[
					{
						task: "Setup queue",
						assigneeId: "11111111-1111-1111-1111-111111111111",
					},
				],
				mockMembers,
			),
		).toEqual([
			{
				task: "Setup queue",
				assigneeId: "11111111-1111-1111-1111-111111111111",
				assigneeName: "Developer",
				assigneeEmail: "dev@example.com",
				assigneeRole: "Backend Developer",
			},
		]);
	});
});

describe("fetchBoardMembers", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("fetches and maps board members from Supabase", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify([
						{
							user_id: "11111111-1111-1111-1111-111111111111",
							profiles: {
								id: "11111111-1111-1111-1111-111111111111",
								email: "dev@example.com",
								full_name: "Developer",
								role: "Backend Developer",
							},
						},
					]),
					{ status: 200 },
				),
			),
		);

		const members = await fetchBoardMembers(
			"https://example.supabase.co",
			"service-role-key",
			"33333333-3333-3333-3333-333333333333",
		);

		expect(members).toEqual([
			{
				id: "11111111-1111-1111-1111-111111111111",
				email: "dev@example.com",
				displayName: "Developer",
				role: "Backend Developer",
			},
		]);
	});

	it("throws when Supabase returns an error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response("Unauthorized", { status: 401 }),
			),
		);

		await expect(
			fetchBoardMembers(
				"https://example.supabase.co",
				"bad-key",
				"33333333-3333-3333-3333-333333333333",
			),
		).rejects.toThrow("Supabase 401: Unauthorized");
	});
});

describe("saveBoardTasks", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("inserts tasks into todo column and assignees", async () => {
		const requests: Array<{ url: string; method: string; body?: string }> = [];

		vi.stubGlobal(
			"fetch",
			vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				const method = init?.method ?? "GET";
				requests.push({ url, method, body: init?.body as string | undefined });

				if (url.includes("/board_columns")) {
					return Promise.resolve(
						new Response(JSON.stringify([{ id: "column-1" }]), { status: 200 }),
					);
				}

				if (url.includes("/board_tasks") && method === "GET") {
					return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
				}

				if (url.includes("/board_tasks") && method === "POST") {
					return Promise.resolve(
						new Response(JSON.stringify([{ id: "saved-task-1" }]), {
							status: 201,
						}),
					);
				}

				if (url.includes("/board_task_assignees")) {
					return Promise.resolve(new Response(JSON.stringify([]), { status: 201 }));
				}

				return Promise.resolve(new Response("Not Found", { status: 404 }));
			}),
		);

		const saved = await saveBoardTasks(
			"https://example.supabase.co",
			"service-role-key",
			"33333333-3333-3333-3333-333333333333",
			[
				{
					task: "Setup queue",
					assigneeId: "11111111-1111-1111-1111-111111111111",
					assigneeName: "Developer",
					assigneeEmail: "dev@example.com",
					assigneeRole: "Backend Developer",
				},
			],
		);

		expect(saved).toEqual([
			{
				id: "saved-task-1",
				task: "Setup queue",
				assigneeId: "11111111-1111-1111-1111-111111111111",
				assigneeName: "Developer",
				assigneeEmail: "dev@example.com",
				assigneeRole: "Backend Developer",
			},
		]);
		expect(requests.some((request) => request.url.includes("/board_tasks"))).toBe(
			true,
		);
		expect(
			requests.some((request) => request.url.includes("/board_task_assignees")),
		).toBe(true);
	});
});
