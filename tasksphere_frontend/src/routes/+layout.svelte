<script lang="ts">
	import '../app.css';
	import Sidebar from './Sidebar.svelte';
	let { children } = $props();
</script>

<div class="layout-root">
	<Sidebar />
	<div class="layout-main">
		<main>
			{@render children()}
		</main>
		<footer>
			<p>
				visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to learn about SvelteKit
			</p>
		</footer>
	</div>
</div>

<style>
	.layout-root {
		display: flex;
		min-height: 100vh;
		flex-direction: row;
		background: transparent;
	}
	.layout-main {
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	main {
		flex: 1 0 auto;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
		padding: 1.2rem 1.1rem 1.4rem 1.1rem;
	}
	footer {
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}
	footer a {
		font-weight: bold;
	}
	@media (max-width: 860px) {
		.layout-root {
			flex-direction: column;
		}
		.layout-main {
			margin-left: 0;
		}
	}
	@media (max-width: 600px) {
		main {
			padding: 0.75em 0.1em 2em 0.1em;
		}
	}
</style>
