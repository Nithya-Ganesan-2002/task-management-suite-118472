<script lang="ts">
	import { onMount } from 'svelte';
	import { getProductivityStats, type StatsPayload } from '$lib/api/stats';
	import Widget from './Widget.svelte';
	import StatusBar from './StatusBar.svelte';

	let stats: StatsPayload | null = null;
	let error: string | null = null;
	let loading = true;

	onMount(async () => {
		try {
			stats = await getProductivityStats();
		} catch (e) {
			if (typeof e === 'object' && e && 'message' in e) {
				error = (e as { message?: string }).message ?? 'Failed to load productivity stats';
			} else {
				error = 'Failed to load productivity stats';
			}
		} finally {
			loading = false;
		}
	});

	function formatStatus(status: string) {
		if (status === 'todo') return 'To Do';
		if (status === 'in_progress') return 'In Progress';
		if (status === 'done') return 'Done';
		return status;
	}
	function formatDate(dt: string) {
		const d = new Date(dt);
		return d.toLocaleString();
	}
</script>

<svelte:head>
	<title>Productivity Dashboard</title>
	<meta name="description" content="Productivity stats and reports for your tasks and boards." />
</svelte:head>

<div class="dashboard-root">
	<h1>Productivity Dashboard</h1>
	{#if loading}
		<div class="dashboard-loading">Loading stats...</div>
	{:else if error}
		<div class="dashboard-error">{error}</div>
	{:else if stats}
		<div class="dashboard-widgets">
			<!-- KPIs -->
			<div class="dashboard-kpis">
				<Widget title="Total Tasks" value={stats.total_tasks} icon="📝" color="var(--color-theme-2)" />
				<Widget title="Completed" value={stats.completed_tasks} icon="✅" color="#15C39A" />
				<Widget title="Boards" value={stats.total_boards} icon="📋" color="var(--color-theme-1)" />
			</div>

			<!-- Graphs/Stats -->
			<div class="dashboard-graphs">
				<StatusBar tasksByStatus={stats.tasks_by_status} />
			</div>

			<div class="dashboard-activity">
				<h2>Recent Activity</h2>
				{#if stats.recent_activity && stats.recent_activity.length}
					<ul class="activity-list">
						{#each stats.recent_activity as act (act.id)}
							<li>
								<span class="status-dot {act.status}"></span>
								<strong>{act.title}</strong>
								<small>[{formatStatus(act.status)}]</small>
								<em>{formatDate(act.updated_at)}</em>
							</li>
						{/each}
					</ul>
				{:else}
					<div>No recent activity.</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

