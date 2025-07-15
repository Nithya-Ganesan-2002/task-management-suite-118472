<script lang="ts">
	import dndzone from 'svelte-dnd-list';
	import { onMount } from 'svelte';
	import { realtimeStore } from '$lib/realtimeStore';
	import {
		createTask,
		updateTask,
		deleteTask,
		uploadTaskAttachment,
		type Task as TaskType
	} from '$lib/api/tasks';

	export let board: {
		id: number;
		user_id: string;
		title: string;
		description?: string;
		order: number;
		created_at: string;
		updated_at: string;
		tasks?: TaskType[];
	};

	export let reloadBoard: () => void;

	const columnOrder: Array<'todo' | 'in_progress' | 'done'> = ['todo', 'in_progress', 'done'];
	let columns: Record<'todo' | 'in_progress' | 'done', TaskType[]> = {
		todo: [],
		in_progress: [],
		done: []
	};

	let loading = false;
	let error: string | null = null;

	let showTaskModal = false;
	let editingTask: TaskType | null = null;
	let newTaskStatus: 'todo' | 'in_progress' | 'done' = 'todo';
	let newTaskTitle = '';
	let newTaskDesc = '';
	let newTaskFile: File | null = null;

	let showDeleteConfirm = false;
	let deleteTaskId: number | null = null;

	function groupTasksByStatus(tasks: TaskType[]) {
		const colMap: Record<'todo' | 'in_progress' | 'done', TaskType[]> = { todo: [], in_progress: [], done: [] };
		for (const t of tasks) {
			if (colMap[t.status]) colMap[t.status].push(t);
		}
		return colMap;
	}

	$: columns = board && board.tasks ? groupTasksByStatus(board.tasks) : columns;

	// DnD handlers
	async function handleTaskDrop(event: CustomEvent, status: 'todo' | 'in_progress' | 'done') {
		const { items } = event.detail as { items: TaskType[] };
		columns[status] = items;
		loading = true;
		try {
			for (let idx = 0; idx < items.length; idx++) {
				await updateTask(items[idx].id, { status });
			}
			await reloadBoard();
		} catch (e: unknown) {
			const message = typeof e === "object" && e && "message" in e ? (e as { message?: string }).message : null;
			error = message || 'Failed to reorder/move task';
		} finally {
			loading = false;
		}
	}

	function openCreateTask(status: 'todo' | 'in_progress' | 'done') {
		editReset();
		showTaskModal = true;
		newTaskStatus = status;
	}

	function openEditTask(task: TaskType) {
		editingTask = task;
		showTaskModal = true;
		newTaskStatus = task.status;
		newTaskTitle = task.title;
		newTaskDesc = task.description || '';
	}

	async function handleTaskSave() {
		try {
			loading = true;
			if (editingTask) {
				// Update
				await updateTask(editingTask.id, {
					title: newTaskTitle,
					description: newTaskDesc,
					status: newTaskStatus
				});
				if (newTaskFile) {
					await uploadTaskAttachment(editingTask.id, newTaskFile);
				}
			} else {
				// Create
				const created = await createTask({
					title: newTaskTitle,
					description: newTaskDesc,
					status: newTaskStatus,
					boardId: board.id
				});
				if (newTaskFile) {
					await uploadTaskAttachment(created.id, newTaskFile);
				}
			}
			editReset();
			showTaskModal = false;
			await reloadBoard();
		} catch (e: unknown) {
			const message = typeof e === "object" && e && "message" in e ? (e as { message?: string }).message : null;
			error = message ?? 'Failed to save task';
		} finally {
			loading = false;
		}
	}

	function editReset() {
		editingTask = null;
		newTaskStatus = 'todo';
		newTaskTitle = '';
		newTaskDesc = '';
		newTaskFile = null;
		error = null;
	}

	function confirmDeleteTask(id: number) {
		showDeleteConfirm = true;
		deleteTaskId = id;
	}

	async function handleDeleteTask() {
		if (!deleteTaskId) return;
		loading = true;
		try {
			await deleteTask(deleteTaskId);
			showDeleteConfirm = false;
			await reloadBoard();
			deleteTaskId = null;
		} catch (e: unknown) {
			const message = typeof e === "object" && e && "message" in e ? (e as { message?: string }).message : null;
			error = message ?? 'Failed to delete task';
		} finally {
			loading = false;
		}
	}

	function handleFileInput(e: Event) {
		const files = (e.target as HTMLInputElement).files;
		newTaskFile = (files && files.length) ? files[0] : null;
	}

	function decodeFileName(url: string): string {
		try {
			const parts = url.split(/[\\/]/);
			return decodeURIComponent(parts[parts.length - 1]);
		} catch {
			return url;
		}
	}

	// Subscribe to Supabase realtime task updates affecting this board
	onMount(() => {
		const unsub = realtimeStore.subscribe(({ taskEvent }) => {
			if (
				taskEvent &&
				board &&
				(
					(taskEvent.task && taskEvent.task.board_id === board.id) ||
					!('board_id' in (taskEvent.task || {}))
				)
			) {
				reloadBoard();
				realtimeStore.clearEvents();
			}
			return undefined;
		});
		return () => unsub();
	});
</script>

<div class="kanban-root">
	<div class="kanban-board-title">
		<h1>{board.title}</h1>
		{#if board.description}
			<p>{board.description}</p>
		{/if}
	</div>
	<div class="kanban-columns">
		{#each columnOrder as col (col)}
			<div class="kanban-column">
				<div class="kanban-col-head">
					<h2>{col === 'todo' ? 'To Do' : col === 'in_progress' ? 'In Progress' : 'Done'}</h2>
					<button class="add-btn" title="Add Task" on:click={() => openCreateTask(col)}>+</button>
				</div>
				<ul
					use:dndzone={{ items: columns[col], flipDurationMs: 300, dragDisabled: false }}
					on:consider={(e) => handleTaskDrop(e, col)}
					class="task-list"
				>
					{#each columns[col] as task (task.id)}
						<li class="kanban-task" data-id={task.id}>
							<div class="task-title-row">
								<strong>{task.title}</strong>
								<div class="task-act">
									<button title="Edit" on:click={() => openEditTask(task)}>✏️</button>
									<button title="Delete" on:click={() => confirmDeleteTask(task.id)}>🗑️</button>
								</div>
							</div>
							{#if task.description}
								<div class="desc">{task.description}</div>
							{/if}
							{#if task.attachments && task.attachments.length}
								<div class="attachments">
									<strong>Attachments:</strong>
									<ul>
										{#each task.attachments as att (att.id)}
											<li>
												<a href={att.file_url} target="_blank" rel="noopener noreferrer">
													{decodeFileName(att.file_url)}
												</a>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</div>

{#if showTaskModal}
	<div class="modal">
		<form class="task-form" on:submit|preventDefault={handleTaskSave}>
			<h2>{editingTask ? 'Edit Task' : 'New Task'}</h2>
			<label>
				Title
				<input bind:value={newTaskTitle} required placeholder="Task title" />
			</label>
			<label>
				Description
				<textarea bind:value={newTaskDesc} rows="2" placeholder="Describe the task"></textarea>
			</label>
			<label>
				Status
				<select bind:value={newTaskStatus}>
					<option value="todo">To Do</option>
					<option value="in_progress">In Progress</option>
					<option value="done">Done</option>
				</select>
			</label>
			<label>
				Attachment
				<input type="file" accept="*" on:change={handleFileInput} />
				{#if editingTask && editingTask.attachments && editingTask.attachments.length}
					<div class="attached-files">
						<strong>Existing files:</strong>
						<ul>
							{#each editingTask.attachments as file (file.id)}
								<li>
									<a href={file.file_url} target="_blank" rel="noopener noreferrer">{decodeFileName(file.file_url)}</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</label>
			{#if error}
				<div class="kanban-error">{error}</div>
			{/if}
			<div class="task-buttons">
				<button type="submit" disabled={loading}>{loading ? 'Saving...' : (editingTask ? 'Update' : 'Create')}</button>
				<button type="button" on:click={() => { showTaskModal = false; editReset(); }}>Cancel</button>
			</div>
		</form>
	</div>
{/if}

{#if showDeleteConfirm}
	<div class="modal">
		<div class="confirm-dialog">
			<p>Delete this task? This cannot be undone.</p>
			<button on:click={handleDeleteTask} disabled={loading}>Yes, Delete</button>
			<button on:click={() => { showDeleteConfirm = false; deleteTaskId = null; }}>Cancel</button>
		</div>
	</div>
{/if}

<style>
/* styles unchanged for brevity; see previous version */
.kanban-root {
	max-width: 90vw;
	margin: 0 auto;
}
.kanban-board-title {
	text-align: center;
	margin-bottom: 1rem;
}
.kanban-columns {
	display: flex;
	gap: 1rem;
	justify-content: stretch;
	flex-wrap: wrap;
}
.kanban-column {
	background: var(--color-bg-2);
	padding: 1rem;
	border-radius: 10px;
	width: 100%;
	max-width: 22rem;
	box-shadow: 0 2px 20px rgba(27,60,109,0.07);
	flex: 1 1 18rem;
	display: flex;
	flex-direction: column;
}
.kanban-col-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 0.6rem;
}
.add-btn {
	background: var(--color-theme-1);
	border: none;
	color: #fff;
	border-radius: 50%;
	font-size: 1.25em;
	width: 2em;
	height: 2em;
	cursor: pointer;
	box-shadow: 0 1px 8px rgba(27 60 109/11%);
	transition: background 0.2s;
}
.add-btn:hover { background: var(--color-theme-2);}
.task-list {
	list-style: none;
	margin: 0;
	padding: 0;
	min-height: 3rem;
	display: flex;
	flex-direction: column;
	gap: 0.6em;
}
.kanban-task {
	background: var(--color-bg-0);
	border-radius: 7px;
	padding: 0.95em 1em 0.65em 1em;
	box-shadow: 0 2px 7px rgba(39,110,241,0.07);
	cursor: grab;
	display: flex;
	flex-direction: column;
	gap: 0.25em;
	border: 1px solid var(--color-bg-2);
}
.task-title-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.task-act button {
	background: none;
	border: none;
	font-size: 1em;
	cursor: pointer;
	padding: 0 0.25em;
}
.task-act button:hover { color: var(--color-theme-2);}
.desc { font-size: 0.98em; color: #686868;}
.modal {
	position: fixed;
	background: rgba(30,44,62,0.22);
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 100;
}
.task-form, .confirm-dialog {
	background: var(--color-bg-0);
	border-radius: 14px;
	box-shadow: 0 7px 38px rgba(60,80,120,0.09);
	padding: 2rem;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	min-width: 320px;
}
.task-buttons {
	display: flex;
	gap: 0.8em;
	align-items: center;
}
.kanban-error {
	color: #b02315;
	font-weight: 600;
}

/* Attachment styles */
.attachments, .attached-files {
	margin-top: 0.3em;
	font-size: 0.97em;
	color: #4A607B;
}
.attachments ul, .attached-files ul {
	margin: 0.1em 0 0 1.2em;
	padding: 0;
	list-style: disc inside;
}
.attachments a, .attached-files a {
	color: var(--color-theme-2);
	text-decoration: underline dotted;
	word-break: break-all;
	font-size: 0.98em;
}
.attachments a:hover, .attached-files a:hover {
	color: var(--color-theme-1);
}
</style>
