<script lang="ts">
	export let tasksByStatus: { todo: number, in_progress: number, done: number };

	$: total =
		(tasksByStatus?.todo || 0) +
		(tasksByStatus?.in_progress || 0) +
		(tasksByStatus?.done || 0);

	$: pct = {
		todo: total ? (tasksByStatus.todo / total) * 100 : 0,
		in_progress: total ? (tasksByStatus.in_progress / total) * 100 : 0,
		done: total ? (tasksByStatus.done / total) * 100 : 0
	};
</script>

<div class="status-bar">
	<div class="bar todo" style="width:{pct.todo}%" title="To Do: {tasksByStatus.todo}"></div>
	<div class="bar in_progress" style="width:{pct.in_progress}%" title="In Progress: {tasksByStatus.in_progress}"></div>
	<div class="bar done" style="width:{pct.done}%" title="Done: {tasksByStatus.done}"></div>
	<div class="status-labels">
		<span>To Do: {tasksByStatus.todo}</span>
		<span>In Progress: {tasksByStatus.in_progress}</span>
		<span>Done: {tasksByStatus.done}</span>
	</div>
</div>

<style>
.status-bar {
	display: flex;
	width: 100%;
	height: 30px;
	border-radius: 6px;
	overflow: hidden;
	background: var(--color-bg-2);
	position: relative;
	box-shadow: 0 2px 8px rgba(27,60,109,0.06);
}
.status-bar .bar {
	height: 100%;
	transition: width .35s cubic-bezier(.48,.18,.57,.73);
}
.status-bar .bar.todo { background: #ffe354; }
.status-bar .bar.in_progress { background: #aad7ff; }
.status-bar .bar.done { background: #15C39A; }
.status-bar .status-labels {
	position: absolute;
	width: 100%;
	top: 0; left: 0;
	display: flex;
	justify-content: space-between;
	padding: 0 1.2em;
	font-size: 0.99em;
	height: 100%;
	align-items: center;
	pointer-events: none;
}
</style>
