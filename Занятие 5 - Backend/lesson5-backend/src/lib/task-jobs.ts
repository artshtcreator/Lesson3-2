import type { TaskItem } from "./task-breakdown";

export type TaskJobStatus = "pending" | "processing" | "completed" | "failed";

export interface TaskJob {
	id: string;
	status: TaskJobStatus;
	tasks?: TaskItem[];
	error?: string;
	createdAt: string;
	updatedAt: string;
}

export interface TaskJobQueueMessage {
	jobId: string;
	message: string;
	boardId: string;
}

function jobKey(jobId: string): string {
	return `job:${jobId}`;
}

export async function getTaskJob(
	kv: KVNamespace,
	jobId: string,
): Promise<TaskJob | null> {
	const raw = await kv.get(jobKey(jobId));
	if (!raw) {
		return null;
	}

	return JSON.parse(raw) as TaskJob;
}

export async function saveTaskJob(
	kv: KVNamespace,
	job: TaskJob,
): Promise<void> {
	await kv.put(jobKey(job.id), JSON.stringify(job), {
		expirationTtl: 3600,
	});
}

export async function createPendingTaskJob(
	kv: KVNamespace,
): Promise<TaskJob> {
	const now = new Date().toISOString();
	const job: TaskJob = {
		id: crypto.randomUUID(),
		status: "pending",
		createdAt: now,
		updatedAt: now,
	};

	await saveTaskJob(kv, job);
	return job;
}

export async function updateTaskJob(
	kv: KVNamespace,
	jobId: string,
	update: Partial<Pick<TaskJob, "status" | "tasks" | "error">>,
): Promise<TaskJob | null> {
	const job = await getTaskJob(kv, jobId);
	if (!job) {
		return null;
	}

	const updatedJob: TaskJob = {
		...job,
		...update,
		updatedAt: new Date().toISOString(),
	};

	await saveTaskJob(kv, updatedJob);
	return updatedJob;
}
