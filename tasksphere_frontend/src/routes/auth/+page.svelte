<script lang="ts">
	export const prerender = false;
	import { auth } from '$lib/authStore';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let mode: 'signup' | 'login' = 'login';
	let errorMsg: string | null = null;
	let loading = false;

	let unsubscribe: () => void;

	// React to auth state
	let user = null;
	let authLoading = true;
	onMount(() => {
		unsubscribe = auth.subscribe(($auth) => {
			user = $auth.user;
			authLoading = $auth.loading;
		});

		return () => unsubscribe && unsubscribe();
	});

	// PUBLIC_INTERFACE
	async function handleSignup() {
		errorMsg = null;
		loading = true;
		try {
			await auth.signup(email, password);
			mode = 'login';
			errorMsg = 'Signup successful! Please check your email for verification and login.';
			email = '';
			password = '';
		} catch (error) {
			// @ts-expect-error Error type is not guaranteed to have .message at runtime, but we want to extract it if present
			errorMsg = error.message || 'Signup failed';
		} finally {
			loading = false;
		}
	}

	// PUBLIC_INTERFACE
	async function handleLogin() {
		errorMsg = null;
		loading = true;
		try {
			await auth.login(email, password);
			goto('/');
		} catch (error) {
			// @ts-expect-error Error type is not guaranteed to have .message at runtime, but we want to extract it if present
			errorMsg = error.message || 'Login failed';
		} finally {
			loading = false;
		}
	}

	// PUBLIC_INTERFACE
	async function handleLogout() {
		loading = true;
		errorMsg = null;
		try {
			await auth.logout();
			email = '';
			password = '';
		} catch (error) {
			// @ts-expect-error Error type is not guaranteed to have .message at runtime, but we want to extract it if present
			errorMsg = error.message || 'Logout failed';
		} finally {
			loading = false;
		}
	}
</script>

<section class="auth-section">
	<h1>{mode === 'signup' ? 'Sign Up' : user ? 'Account' : 'Login'}</h1>

	{#if authLoading}
		<p>Loading...</p>
	{:else if user}
		<p>Signed in as <strong>{user.email}</strong></p>
		<button class="logout-btn" disabled={loading} on:click|preventDefault={handleLogout}>Logout</button>
	{:else}
		<form on:submit|preventDefault={mode === 'signup' ? handleSignup : handleLogin} class="auth-form">
			<div>
				<label for="email">Email</label>
				<input id="email" name="email" type="email" bind:value={email} required autocomplete="username" />
			</div>
			<div>
				<label for="password">Password</label>
				<input id="password" name="password" type="password" bind:value={password} required autocomplete="current-password" />
			</div>
			{#if errorMsg}
				<p class="error-msg">{errorMsg}</p>
			{/if}
			<button disabled={loading} type="submit">{mode === 'signup' ? 'Sign Up' : 'Login'}</button>
			<p>
				{#if mode === 'login'}
					Don't have an account?
					<button type="button" class="link-btn" on:click={() => { mode = 'signup'; errorMsg = null; }}>
						Sign up
					</button>
				{:else}
					Already have an account?
					<button type="button" class="link-btn" on:click={() => { mode = 'login'; errorMsg = null; }}>
						Login
					</button>
				{/if}
			</p>
		</form>
	{/if}
</section>

<style>
.auth-section {
	max-width: 420px;
	margin: 2rem auto;
	background: var(--color-bg-0);
	border-radius: 8px;
	padding: 2rem 2rem 1.5rem 2rem;
	box-shadow: 0 5px 24px rgba(27,60,109,0.12);
}
.auth-form {
	display: flex;
	flex-direction: column;
	gap: 1.2rem;
}
label {
	font-size: 1rem;
	margin-bottom: 0.2em;
	color: var(--color-theme-1);
}
input {
	padding: 0.7rem;
	border: 1.5px solid var(--color-bg-2);
	border-radius: 6px;
	font-size: 1rem;
	background: var(--color-bg-2);
}
button {
	padding: 0.7rem 1.2rem;
	background: var(--color-theme-1);
	color: #fff;
	font-weight: 700;
	border: none;
	border-radius: 6px;
	transition: background 0.2s;
	cursor: pointer;
}
button[disabled] {
	opacity: 0.6;
	cursor: not-allowed;
}
.logout-btn {
	background: var(--color-theme-2);
}
.error-msg {
	color: #b02315;
	font-weight: 600;
	margin-top: 0.2rem;
}
.link-btn {
	background: none;
	border: none;
	color: var(--color-theme-1);
	text-decoration: underline;
	cursor: pointer;
	font-size: 1em;
	margin-left: 0.25em;
	padding: 0;
}
.link-btn:hover {
	color: var(--color-theme-2);
}
</style>
