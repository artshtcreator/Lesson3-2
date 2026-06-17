import type { BoardMember } from "./supabase";

interface OpenRouterChatResponse {
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
}

function buildTaskBreakdownSystemPrompt(members: BoardMember[]): string {
	const memberLines = members
		.map(
			(member) =>
				`- id: ${member.id}, name: ${member.displayName}, role: ${member.role ?? "null"}`,
		)
		.join("\n");

	return [
		"You are a task decomposition assistant.",
		"Split the user's big task into smaller actionable tasks.",
		"Assign each subtask to exactly one team member based on their role and skills.",
		"If a member has no role, assign tasks based on task meaning and balance workload.",
		"Use only assigneeId values from the available team members list.",
		'Return only valid JSON array in this exact shape: [{"task":"...","assigneeId":"..."}].',
		"Do not include markdown, explanations, keys other than task and assigneeId, or additional text.",
		"Available team members:",
		memberLines,
	].join("\n");
}

export const OPENROUTER_REQUEST_TIMEOUT_MS = 120_000;

function isTimeoutError(error: unknown): boolean {
	return (
		error instanceof DOMException && error.name === "TimeoutError"
	);
}

export async function chatWithDeepSeek(
	apiKey: string,
	message: string,
	members: BoardMember[],
): Promise<string> {
	let response: Response;
	try {
		response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(OPENROUTER_REQUEST_TIMEOUT_MS),
				body: JSON.stringify({
					model: "deepseek/deepseek-v4-pro",
					messages: [
						{
							role: "system",
							content: buildTaskBreakdownSystemPrompt(members),
						},
						{ role: "user", content: message },
					],
					response_format: {
						type: "json_schema",
						json_schema: {
							name: "task_breakdown",
							strict: true,
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										task: { type: "string" },
										assigneeId: { type: "string" },
									},
									required: ["task", "assigneeId"],
									additionalProperties: false,
								},
								minItems: 1,
							},
						},
					},
				}),
			},
		);
	} catch (error) {
		if (isTimeoutError(error)) {
			throw new Error(
				`OpenRouter request timed out after ${OPENROUTER_REQUEST_TIMEOUT_MS}ms`,
			);
		}
		throw error;
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`OpenRouter ${response.status}: ${errorText}`);
	}

	const data = (await response.json()) as OpenRouterChatResponse;
	const reply = data.choices?.[0]?.message?.content;
	if (!reply) {
		throw new Error("Empty response from OpenRouter");
	}
	return reply;
}
