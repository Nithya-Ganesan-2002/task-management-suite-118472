import { supabase } from '$lib/supabaseClient';

const API_BASE = import.meta.env.VITE_BACKEND_API || '/api'; // fallback to proxy

// PUBLIC_INTERFACE
export async function getAuthJWT(): Promise<string | null> {
	const { data } = await supabase.auth.getSession();
	return data?.session?.access_token || null;
}

// PUBLIC_INTERFACE
export type Task = {
	id: number;
	user_id: string;
	title: string;
	description?: string;
	status: 'todo' | 'in_progress' | 'done';
	created_at: string;
	updated_at: string;
	attachments?: Array<{ file_url: string; id: number; }>;
};

export type CreateTaskPayload = {
	title: string;
	description?: string;
	status?: 'todo' | 'in_progress' | 'done';
	boardId?: number; // For immediate assignment
};

export type UpdateTaskPayload = {
	title?: string;
	description?: string;
	status?: 'todo' | 'in_progress' | 'done';
};

export async function listTasks(): Promise<Task[]> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/tasks`, {
		headers: { Authorization: `Bearer ${jwt}` }
	});
	if (!res.ok) throw new Error('Failed to load tasks');
	return await res.json();
}

// PUBLIC_INTERFACE
export async function getTask(id: number): Promise<Task> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/tasks/${id}`, {
		headers: { Authorization: `Bearer ${jwt}` }
	});
	if (!res.ok) throw new Error('Failed to get task');
	return await res.json();
}

// PUBLIC_INTERFACE
export async function createTask(payload: CreateTaskPayload): Promise<Task> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/tasks`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${jwt}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			title: payload.title,
			description: payload.description,
			status: payload.status
		})
	});
	if (!res.ok) throw new Error('Failed to create task');
	const task = await res.json();
	// Attach to board if specified
	if (payload.boardId && task?.id) {
		await assignTaskToBoard(payload.boardId, task.id);
	}
	return task;
}

// PUBLIC_INTERFACE
export async function updateTask(id: number, data: UpdateTaskPayload): Promise<Task> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/tasks/${id}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${jwt}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	if (!res.ok) throw new Error('Failed to update task');
	return await res.json();
}

// PUBLIC_INTERFACE
export async function deleteTask(id: number): Promise<void> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/tasks/${id}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${jwt}` }
	});
	if (!res.ok) throw new Error('Failed to delete task');
}

// PUBLIC_INTERFACE
export async function assignTaskToBoard(boardId: number, taskId: number, order?: number): Promise<void> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/boards/${boardId}/tasks`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${jwt}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			task_id: taskId,
			order: order ?? 1 // default order=1 if not specified
		})
	});
	if (!res.ok) throw new Error('Failed to assign/move task to board');
}

/**
 * Attach a file to a specific task.
 * @param {number} taskId 
 * @param {File} file 
 * @returns {Promise<{file_url: string}>}
 */
export async function uploadTaskAttachment(taskId: number, file: File): Promise<{ file_url: string }> {
	const jwt = await getAuthJWT();
	const form = new FormData();
	form.append('file', file);

	const res = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${jwt}` },
		body: form
	});
	if (!res.ok) throw new Error('Failed to upload file');
	return await res.json();
}
