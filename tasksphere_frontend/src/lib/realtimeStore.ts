import { writable, type Writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';

/** Board type for realtime events */
export type Board = {
	id: number;
	user_id: string;
	title: string;
	description?: string;
	order: number;
	created_at: string;
	updated_at: string;
	tasks?: Task[];
};
/** Task type for realtime events */
export type Task = {
	id: number;
	user_id: string;
	title: string;
	description?: string;
	status: string;
	created_at: string;
	updated_at: string;
	attachments?: { file_url: string; id: number }[];
};

export interface BoardUpdateEvent {
	type: 'INSERT' | 'UPDATE' | 'DELETE';
	board: Board;
}
export interface TaskUpdateEvent {
	type: 'INSERT' | 'UPDATE' | 'DELETE';
	task: Task;
}

type RealtimeState = {
	boardEvent: BoardUpdateEvent | null;
	taskEvent: TaskUpdateEvent | null;
};

function createRealtimeStore() {
	const { subscribe, set, update }: Writable<RealtimeState> = writable({
		boardEvent: null,
		taskEvent: null
	});

	let boardChannel: ReturnType<typeof supabase.channel> | null = null;
	let taskChannel: ReturnType<typeof supabase.channel> | null = null;

	// PUBLIC_INTERFACE
	/**
	 * Subscribe to Supabase real-time changes on boards and tasks tables for the current user.
	 * @param {string} user_id The currently authenticated user's id.
	 */
	function subscribeRealtime(user_id: string) {
		// Unsubscribe old first
		unsubscribe();

		// Subscribe to Boards
		boardChannel = supabase
			.channel('realtime:boards')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'boards',
					filter: user_id ? `user_id=eq.${user_id}` : undefined
				},
				(payload) => {
					update((prev) => ({
						...prev,
						boardEvent: {
							type: payload.eventType,
							board: payload.new ?? payload.old
						}
					}));
				}
			)
			.subscribe();

		// Subscribe to Tasks
		taskChannel = supabase
			.channel('realtime:tasks')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'tasks',
					filter: user_id ? `user_id=eq.${user_id}` : undefined
				},
				(payload) => {
					update((prev) => ({
						...prev,
						taskEvent: {
							type: payload.eventType,
							task: payload.new ?? payload.old
						}
					}));
				}
			)
			.subscribe();
	}

	// PUBLIC_INTERFACE
	function clearEvents() {
		set({ boardEvent: null, taskEvent: null });
	}

	// PUBLIC_INTERFACE
	function unsubscribe() {
		if (boardChannel) supabase.removeChannel(boardChannel);
		if (taskChannel) supabase.removeChannel(taskChannel);
		boardChannel = null;
		taskChannel = null;
	}

	return {
		subscribe,
		subscribeRealtime,
		clearEvents,
		unsubscribe
	};
}

export const realtimeStore = createRealtimeStore();

