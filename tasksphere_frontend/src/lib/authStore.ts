import { writable, type Writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';

export type AuthUser = {
	id: string;
	email: string;
};

export type AuthState = {
	user: AuthUser | null;
	loading: boolean;
};

function createAuthStore() {
	const { subscribe, set }: Writable<AuthState> = writable({ user: null, loading: true });

	// On load, try to fetch session and user info.
	async function init() {
		const { data } = await supabase.auth.getUser();
		if (data?.user) {
			set({ user: { id: data.user.id, email: data.user.email }, loading: false });
		} else {
			set({ user: null, loading: false });
		}
	}

	// Listen for auth state changes.
	supabase.auth.onAuthStateChange((_event, session) => {
		if (session?.user) {
			set({ user: { id: session.user.id, email: session.user.email }, loading: false });
		} else {
			set({ user: null, loading: false });
		}
	});

	init();

	return {
		subscribe,
		// PUBLIC_INTERFACE
		signup: async (email: string, password: string) => {
			const { data, error } = await supabase.auth.signUp({ email, password });
			if (error) throw error;
			return data;
		},
		// PUBLIC_INTERFACE
		login: async (email: string, password: string) => {
			const { data, error } = await supabase.auth.signInWithPassword({ email, password });
			if (error) throw error;
			return data;
		},
		// PUBLIC_INTERFACE
		logout: async () => {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
			return true;
		},
		refresh: init
	};
}

export const auth = createAuthStore();
