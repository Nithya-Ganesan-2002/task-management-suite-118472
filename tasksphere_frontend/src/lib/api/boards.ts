import { supabase } from '$lib/supabaseClient';

const API_BASE = import.meta.env.VITE_BACKEND_API || '/api'; // fallback to proxy

// PUBLIC_INTERFACE
export async function getAuthJWT(): Promise<string | null> {
	// Uses Supabase session to get JWT for backend bearerAuth
	const { data } = await supabase.auth.getSession();
	return data?.session?.access_token || null;
}

// PUBLIC_INTERFACE
type Task = {
	id: number;
	user_id: string;
	title: string;
	description?: string;
	status: string;
	created_at: string;
	updated_at: string;
};

type Board = {
	id: number;
	user_id: string;
	title: string;
	description?: string;
	order: number;
	created_at: string;
	updated_at: string;
	tasks?: Task[];
};

export async function getBoards(): Promise<Board[]> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/boards`, {
		headers: { Authorization: `Bearer ${jwt}` }
	});
	if (!res.ok) throw new Error('Failed to load boards');
	return await res.json();
}

export async function createBoard({ title, description }: { title: string, description?: string }): Promise<Board> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/boards`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${jwt}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ title, description })
	});
	if (!res.ok) throw new Error('Failed to create board');
	return await res.json();
}

export async function updateBoard(id: number, data: { title?: string, description?: string, order?: number }): Promise<Board> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/boards/${id}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${jwt}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	if (!res.ok) throw new Error('Failed to update board');
	return await res.json();
}

export async function deleteBoard(id: number): Promise<void> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/boards/${id}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${jwt}`
		}
	});
	if (!res.ok) throw new Error('Failed to delete board');
}

export async function reorderBoards(newOrderIds: number[]): Promise<void> {
	// Performs PATCH/PUT one by one for all boards in sequence (as backend orders boards by order index)
	for (let i = 0; i < newOrderIds.length; i++) {
		await updateBoard(newOrderIds[i], { order: i + 1 });
	}
}
