import { describe, it, expect, vi, afterEach } from "vitest";
import {
	chatWithDeepSeek,
	OPENROUTER_REQUEST_TIMEOUT_MS,
} from "../src/lib/openrouter";
import type { BoardMember } from "../src/lib/supabase";

const mockMembers: BoardMember[] = [
	{
		id: "user-1",
		email: "dev@example.com",
		displayName: "Developer",
		role: "Backend Developer",
	},
];

describe("chatWithDeepSeek", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns content from OpenRouter response", async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					choices: [{ message: { content: "Hello from DeepSeek" } }],
				}),
				{ status: 200 },
			),
		);
		vi.stubGlobal("fetch", mockFetch);

		const reply = await chatWithDeepSeek("test-key", "Hi", mockMembers);

		expect(reply).toBe("Hello from DeepSeek");
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://openrouter.ai/api/v1/chat/completions",
			expect.objectContaining({
				method: "POST",
				headers: {
					Authorization: "Bearer test-key",
					"Content-Type": "application/json",
				},
			}),
		);
		const requestInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
		const requestBody = JSON.parse((requestInit.body as string) ?? "{}") as {
			model?: string;
			messages?: Array<{ role?: string; content?: string }>;
			response_format?: {
				type?: string;
				json_schema?: {
					schema?: {
						items?: {
							required?: string[];
						};
					};
				};
			};
		};
		expect(requestBody.model).toBe("deepseek/deepseek-v4-pro");
		expect(requestBody.messages?.[0]?.role).toBe("system");
		expect(requestBody.messages?.[0]?.content).toContain("user-1");
		expect(requestBody.messages?.[0]?.content).toContain("Backend Developer");
		expect(requestBody.messages?.[1]).toEqual({
			role: "user",
			content: "Hi",
		});
		expect(requestBody.response_format?.type).toBe("json_schema");
		expect(requestBody.response_format?.json_schema?.schema?.items?.required).toEqual([
			"task",
			"assigneeId",
		]);
		expect(requestInit.signal).toBeDefined();
	});

	it("throws when OpenRouter request times out", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(
				new DOMException("The operation timed out.", "TimeoutError"),
			),
		);

		await expect(chatWithDeepSeek("test-key", "Hi", mockMembers)).rejects.toThrow(
			`OpenRouter request timed out after ${OPENROUTER_REQUEST_TIMEOUT_MS}ms`,
		);
	});

	it("throws when OpenRouter returns an error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response("Unauthorized", { status: 401 }),
			),
		);

		await expect(chatWithDeepSeek("bad-key", "Hi", mockMembers)).rejects.toThrow(
			"OpenRouter 401: Unauthorized",
		);
	});
});
