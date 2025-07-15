<script lang="ts">
	import { onMount } from 'svelte';
	import dndzone from 'svelte-dnd-list';
	import {
		getBoards,
		createBoard,
		updateBoard,
		deleteBoard,
		reorderBoards,
		getAuthJWT
	} from '$lib/api/boards';
	import { auth } from '$lib/authStore';
	import { realtimeStore } from '$lib/realtimeStore';

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

	let boards: Board[] = [];
	let loading = true;
	let error: string | null = null;

	let selectedBoardId: number | null = null;
	let creating = false;
	let newBoardTitle = '';
	let newBoardDesc = '';

	// In-place rename state
	let renamingId: number | null = null;
	let renameTitle = '';

	let authLoaded = false;

	onMount(() => {
		let savedUser: string | null = null;

		const unsub = auth.subscribe(($auth) => {
			authLoaded = !$auth.loading;
			if ($auth.user?.id !== savedUser) {
				savedUser = $auth.user?.id || null;
				if (savedUser) {
					realtimeStore.subscribeRealtime(savedUser);
				} else {
					realtimeStore.unsubscribe();
				}
			}
		});

		initBoards();

		const unsubRealtime = realtimeStore.subscribe(({ boardEvent, taskEvent }) => {
			if (boardEvent) {
				initBoards();
				realtimeStore.clearEvents();
			}
			if (taskEvent) {
				reloadSelectedBoard();
				realtimeStore.clearEvents();
			}
		});

		return () => {
			unsub();
			unsubRealtime();
			realtimeStore.unsubscribe();
		};
	});

	// PUBLIC_INTERFACE
	async function initBoards() {
		loading = true;
		error = null;
		try {
			boards = await getBoards();
			boards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
			if (boards.length && selectedBoardId === null) {
				selectedBoardId = boards[0].id;
			}
		} catch (e: unknown) {
			const msg = typeof e === "object" && e && "message" in e ? (e as { message?: string }).message : null;
			error = msg || 'Failed to load boards';
		} finally {
			loading = false;
		}
	}

	// PUBLIC_INTERFACE
	async function handleCreateBoard() {
		if (!newBoardTitle.trim()) return;
		try {
			const created = await createBoard({ title: newBoardTitle, description: newBoardDesc });
			boards.push(created);
			selectedBoardId = created.id;
			newBoardTitle = '';
			newBoardDesc = '';
			creating = false;
		} catch (e: unknown) {
			const msg = typeof e === "object" && e && "message" in e ? (e as { message?: string }).message : null;
			error = msg || 'Board creation failed';
		}
	}

	// PUBLIC_INTERFACE
	function startRename(id: number, title: string) {
		renamingId = id;
		renameTitle = title;
	}

	// PUBLIC_INTERFACE
	async function handleRenameBoard(id: number) {
		if (!renameTitle.trim()) return;
		try {
			await updateBoard(id, { title: renameTitle });
			const brd = boards.find((b) => b.id === id);
			if (brd) brd.title = renameTitle;
			renamingId = null;
			renameTitle = '';
		} catch (e: unknown) {
			const msg = typeof e === "object" && e && "message" in e ? (e as { message?: string }).message : null;
			error = msg || 'Board rename failed';
		}
	}

	// PUBLIC_INTERFACE
	async function handleDeleteBoard(id: number) {
		if (!confirm('Are you sure you want to delete this board?')) return;
		try {
			await deleteBoard(id);
			boards = boards.filter((b) => b.id !== id);
			if (selectedBoardId === id) {
				selectedBoardId = boards[0]?.id ?? null;
			}
		} catch (e: unknown) {
			const msg = typeof e === "object" && e && "message" in e ? (e as { message?: string }).message : null;
			error = msg || 'Deletion failed';
		}
	}

	// PUBLIC_INTERFACE
	function selectBoard(id: number) {
		selectedBoardId = id;
	}

	// PUBLIC_INTERFACE
	async function handleDnd({ detail }: { detail: { items: Board[] } }) {
		const { items } = detail;
		boards = items;
		await reorderBoards(boards.map((b) => b.id));
	}

	$: selectedBoard = boards.find((b) => b.id === selectedBoardId);

	// For KanbanBoard child: refetch board from API, update boards array with fresh board data
	async function reloadSelectedBoard() {
		loading = true;
		error = null;
		try {
			if (selectedBoardId !== null) {
				const jwt = await getAuthJWT();
				const API_BASE = import.meta.env.VITE_BACKEND_API || '/api';
				const res = await fetch(`${API_BASE}/boards/${selectedBoardId}`, { headers: { Authorization: `Bearer ${jwt}` } });
				if (!res.ok) throw new Error('Failed to reload board');
				const fresh = await res.json();
				const idx = boards.findIndex(b => b.id === selectedBoardId);
				if (idx >= 0) boards[idx] = fresh;
			}
		} catch (e: unknown) {
			const msg = typeof e === "object" && e && "message" in e ? (e as { message?: string }).message : null;
			error = msg || 'Failed to refresh board data';
		} finally {
			loading = false;
		}
	}
</script>

<div class="board-list-container">
	{#if loading || !authLoaded}
		<div class="kanban-loading">Loading boards...</div>
	{:else if error}
		<div class="kanban-error">{error}</div>
	{:else if !boards.length}
		<div class="empty-boards">
			<p>No boards yet. Create one!</p>
			<button on:click={() => (creating = true)}>+ New Board</button>
		</div>
	{:else}
		<div class="boards-header">
			<h2>Your Boards</h2>
			<button on:click={() => (creating = true)}>+ New Board</button>
		</div>
		<ul
			use:dndzone={{ items: boards, flipDurationMs: 300, dragDisabled: false }}
			class="kanban-boards"
			on:consider={handleDnd}
		>
			{#each boards as boardItem (boardItem.id)}
				<li class:selected={boardItem.id === selectedBoardId} data-id={boardItem.id}>
					{#if renamingId === boardItem.id}
						<form on:submit|preventDefault={() => handleRenameBoard(boardItem.id)} class="rename-form">
							<input bind:value={renameTitle} required />
							<button type="submit">Save</button>
							<button type="button" on:click={() => (renamingId = null)}>Cancel</button>
						</form>
					{:else}
						<div class="board-item-btns">
							<button
								class="board-select-btn"
								type="button"
								on:click={() => selectBoard(boardItem.id)}
								aria-current={boardItem.id === selectedBoardId ? "page" : undefined}
							>
								<span class="board-title">{boardItem.title}</span>
							</button>
							<button
								class="board-action"
								type="button"
								on:click|stopPropagation={() => startRename(boardItem.id, boardItem.title)}
								aria-label="Rename board"
							>
								Rename
							</button>
							<button
								class="board-action"
								type="button"
								on:click|stopPropagation={() => handleDeleteBoard(boardItem.id)}
								aria-label="Delete board"
							>
								Delete
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>

		{#if selectedBoard}
			<div class="selected-board-info">
				<p><strong>Selected:</strong> {selectedBoard.title}</p>
				{#if selectedBoard.description}
					<small>{selectedBoard.description}</small>
				{/if}
			</div>
			<!-- Kanban Board per selectedBoard -->
			{#await import('./KanbanBoard.svelte') then KanbanBoard}
				<KanbanBoard board={selectedBoard} reloadBoard={reloadSelectedBoard} />
			{:catch}
				<div class="kanban-error">Could not load Kanban UI</div>
			{/await}
		{/if}
	{/if}

	{#if creating}
		<div class="modal">
			<form on:submit|preventDefault={handleCreateBoard}>
				<label>
					Board Name
					<input bind:value={newBoardTitle} required placeholder="Board Title" />
				</label>
				<label>
					Description (optional)
					<input bind:value={newBoardDesc} placeholder="Board description" />
				</label>
				<button type="submit">Create</button>
				<button type="button" on:click={() => (creating = false)}>Cancel</button>
			</form>
		</div>
	{/if}
</div>

<style>
/* styles unchanged for brevity; see previous version */
.board-list-container {
	max-width: 32rem;
	margin: auto;
	padding: 2rem 0;
}

.kanban-boards {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	padding: 0;
	margin: 0;
	list-style: none;
}

.kanban-boards li {
	background: var(--color-bg-0);
	border: 1px solid var(--color-bg-2);
	border-radius: 6px;
	font-size: 1.05rem;
	padding: 1rem 1.5rem;
	cursor: grab;
	display: flex;
	align-items: center;
	justify-content: space-between;
	transition: box-shadow .16s;
}
.kanban-boards li.selected {
	border: 2px solid var(--color-theme-1);
	box-shadow: 0 5px 16px rgba(39,110,241,0.09);
}

.board-title {
	flex: 1;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.board-item-btns {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 1em;
	width: 100%;
}

.board-select-btn {
	padding: 0.6em 1.2em;
	flex: 2 1 70%;
	background: none;
	border: none;
	cursor: pointer;
	text-align: left;
	font-size: 1em;
	border-radius: 4px;
	transition: background .16s;
}
.board-select-btn:focus,
.board-select-btn:hover {
	background: var(--color-bg-1);
}

.board-action {
	font-size: 0.9em;
	background: none;
	border: none;
	color: var(--color-theme-1);
	cursor: pointer;
	padding: 0.2em 0.5em;
	border-radius: 3px;
}

.rename-form {
	display: flex;
	align-items: center;
	gap: 0.4em;
}
.rename-form input {
	padding: 0.4em;
}
.kanban-loading, .kanban-error, .empty-boards {
	text-align: center;
	color: #666;
	margin-top: 2rem;
}

.selected-board-info {
	margin-top: 1rem;
	background: var(--color-bg-2);
	border-radius: 6px;
	padding: 1rem;
}

.modal {
	position: fixed;
	background: rgba(30,44,62,0.24);
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 40;
}
.modal form {
	background: var(--color-bg-0);
	padding: 2rem;
	border-radius: 16px;
	box-shadow: 0 6px 40px rgba(60,80,120,0.08);
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
</style>
