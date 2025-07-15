import { supabase } from '$lib/supabaseClient';

const API_BASE = import.meta.env.VITE_BACKEND_API || '/api'; // fallback to proxy

// PUBLIC_INTERFACE
/**
 * Fetch productivity dashboard statistics for the authenticated user.
 * @returns {Promise<StatsPayload>}
 */
export async function getProductivityStats(): Promise<StatsPayload> {
	const jwt = await getAuthJWT();
	const res = await fetch(`${API_BASE}/stats/productivity`, {
		headers: { Authorization: `Bearer ${jwt}` }
	});
	if (!res.ok) throw new Error('Failed to fetch productivity stats');
	return await res.json();
}

// PUBLIC_INTERFACE
export async function getAuthJWT(): Promise<string | null> {
	const { data } = await supabase.auth.getSession();
	return data?.session?.access_token || null;
}

// Typing based on backend OpenAPI
export type ProductivityTaskActivity = {
	id: number;
	title: string;
	status: string;
	updated_at: string;
};

export type StatsPayload = {
	total_tasks: number;
	completed_tasks: number;
	tasks_by_status: {
		todo: number;
		in_progress: number;
		done: number;
	};
	total_boards: number;
	recent_activity: ProductivityTaskActivity[];
};
