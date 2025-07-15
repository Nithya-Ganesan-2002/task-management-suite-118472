<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { auth } from "$lib/authStore";
    import { goto } from '$app/navigation';
    import { getBoards } from '$lib/api/boards';

    // Logo: use favicon as fallback, could be replaced with SVG for bigger/colored logo
    import favicon from "/static/favicon.png";

    // Sidebar open/close for mobile
    let sidebarOpen = false;

    // Auth/user info
    let user = null;
    let authLoading = true;
    $: userEmail = user?.email || "";

    // Boards for navigation
    let boards: { id: number; title: string }[] = [];
    let boardsLoading = true;

    // Handle clicking a board
    function gotoBoard(boardId: number) {
        goto('/?b='+boardId);
        sidebarOpen = false;
    }

    // Derived profile initials
    $: initials = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

    // Dark mode
    let isDark = false;
    function toggleTheme() {
        isDark = !isDark;
        const root = document.documentElement;
        const body = document.body;
        if (isDark) {
            root.classList.add('theme-dark');
            root.classList.remove('theme-light');
            body.classList.add('theme-dark');
            body.classList.remove('theme-light');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('theme-dark');
            root.classList.add('theme-light');
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
            localStorage.setItem('theme', 'light');
        }
    }

    // Effects
    onMount(() => {
        const unsub = auth.subscribe(($auth) => {
            user = $auth.user;
            authLoading = $auth.loading;
        });
        // Theme on load
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const saved = localStorage.getItem('theme');
        isDark = saved === 'dark' ? true : saved === 'light' ? false : prefersDark;
        toggleTheme();

        // Load boards for sidebar
        loadBoards();

        return () => unsub();
    });

    async function loadBoards() {
        boardsLoading = true;
        try {
            const b = await getBoards();
            boards = b.map(({ id, title }) => ({ id, title }));
        } catch {
            boards = [];
        } finally {
            boardsLoading = false;
        }
    }

    function logout() {
        auth.logout();
        goto('/auth');
    }

    // Hide sidebar on overlay click (mobile)
    function closeSidebar() {
        sidebarOpen = false;
    }

    // List of navigation links (excluding boards)
    const navLinks = [
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "About", href: "/about" }
    ];
</script>

<!-- SIDEBAR LAYOUT -->
<nav class="sidebar {sidebarOpen ? 'open' : ''}">
    <div class="sidebar-top">
        <!-- Branding logo -->
        <button class="brand" on:click={() => goto('/')} type="button" aria-label="Go to home">
            <img src={favicon} alt="TaskSphere logo" />
            <span class="brand-text">TaskSphere</span>
        </button>
        <!-- Mobile menu close button -->
        <button class="sidebar-mobile-close" on:click={closeSidebar} aria-label="Close menu">
            ×
        </button>
    </div>

    <!-- Profile / user section -->
    <div class="profile-section">
        <div class="profile-avatar">{initials}</div>
        <div class="profile-info">
            {#if authLoading}
                <span class="profile-email">...</span>
            {:else if user}
                <span class="profile-email">{userEmail}</span>
            {:else}
                <span class="profile-email guest">Guest</span>
            {/if}
        </div>
    </div>
    <div class="sidebar-divider"></div>

    <!-- Board navigation -->
    <section class="sidebar-section">
        <div class="sidebar-section-title">Boards</div>
        {#if boardsLoading}
            <div class="sidebar-loading">Loading…</div>
        {:else if boards.length}
            <ul class="sidebar-list">
                {#each boards as b (b.id)}
                    <li class="sidebar-list-item">
                        <button type="button" class="sidebar-board-btn" on:click={() => gotoBoard(b.id)}>
                            <span class="sidebar-dot"></span>
                            {b.title}
                        </button>
                    </li>
                {/each}
            </ul>
        {:else}
            <div class="sidebar-none">No boards</div>
        {/if}
    </section>

    <div class="sidebar-divider"></div>
    <!-- General nav links -->
    <section class="sidebar-section">
        <ul class="sidebar-list">
            {#each navLinks as link (link.href)}
                <li class="sidebar-list-item">
                    <a class:active={page.url.pathname === link.href} href={link.href}>
                        {link.label}
                    </a>
                </li>
            {/each}
        </ul>
    </section>
    <div class="sidebar-divider"></div>
    <!-- User actions -->
    <section class="sidebar-section actions">
        <button class="sidebar-btn theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">{isDark ? '☀️' : '🌙'}</button>
        {#if user}
            <button class="sidebar-btn logout" on:click={logout}>Logout</button>
        {:else}
            <a class="sidebar-btn login" href="/auth">Login</a>
        {/if}
    </section>
</nav>

<!-- MOBILE OVERLAY/TOGGLE -->
<button class="sidebar-toggle" on:click={() => sidebarOpen = true} aria-label="Open menu">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect y="4" width="24" height="2" fill="currentColor"/><rect y="11" width="24" height="2" fill="currentColor"/><rect y="18" width="24" height="2" fill="currentColor"/></svg>
</button>
{#if sidebarOpen}
    <div
        class="sidebar-overlay"
        role="button"
        tabindex="0"
        aria-label="Close sidebar overlay"
        on:click={closeSidebar}
        on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeSidebar(); }}>
    </div>
{/if}

<style>
:global(:root) {
    --brand-primary: #276EF1;
    --brand-secondary: #15C39A;
    --brand-accent: #F6BE00;
}
.sidebar {
    position: fixed;
    z-index: 120;
    left: 0;
    top: 0;
    bottom: 0;
    width: 270px;
    background: var(--color-bg-1, #fff);
    border-right: 1.5px solid var(--brand-primary);
    color: var(--color-text);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    transform: translateX(-100%);
    transition: transform .32s cubic-bezier(.48,.18,.57,.73);
    box-shadow: 2px 0 14px 0 rgba(30,44,62,0.05);
    min-height: 100vh;
}
.sidebar.open {
    transform: translateX(0);
}
.sidebar-top {
    display: flex;
    align-items: center;
    height: 4rem;
    border-bottom: 1px solid var(--brand-primary);
    position: relative;
    justify-content: space-between;
    padding: 0 .6rem 0 1.2rem;
}
.brand {
    display: flex;
    align-items: center;
    gap: 0.8em;
    cursor: pointer;
    background: none;
    border: none;
}
.brand img {
    width: 36px;
    height: 36px;
    object-fit: contain;
    border-radius: 5px;
    border: 2px solid var(--brand-accent, #F6BE00);
    background: #fff;
}
.brand-text {
    font-size: 1.23em;
    font-weight: 800;
    letter-spacing: .03em;
    color: var(--brand-primary, #276EF1);
}
.sidebar-mobile-close {
    display: none;
    font-size: 2.1em;
    background: none;
    border: none;
    color: var(--brand-primary, #276EF1);
    cursor: pointer;
    margin-left: auto;
}

/* Profile section */
.profile-section {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 1.15em 1em 0.8em 1.1em;
    gap: 0.9em;
}
.profile-avatar {
    min-width: 2.4em;
    min-height: 2.4em;
    background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1em;
    letter-spacing: .02em;
    box-shadow: 0 1px 8px rgba(60,80,120,0.08);
}
.profile-info {
    font-size: 0.98em;
    display: flex;
    flex-direction: column;
}
.profile-email {
    font-weight: 500;
    color: var(--color-theme-2, var(--brand-secondary));
    font-size: 1.01em;
}
.profile-email.guest {
    color: #999;
}
.sidebar-divider {
    height: 1px;
    width: 94%;
    align-self: center;
    border-bottom: 1px solid #ecf3fc;
    margin: 0.7em 0 0.6em 0;
}

.sidebar-section {
    padding: 0 1.25em 0.2em 1.25em;
    display: flex;
    flex-direction: column;
}
.sidebar-section-title {
    font-size: 1.01em;
    color: var(--brand-accent);
    font-weight: 700;
    margin-bottom: 0.25em;
    margin-top: 0.39em;
    letter-spacing: 0.07em;
}
.sidebar-list {
    list-style: none;
    margin: 0.15em 0 0.3em 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1em;
}
.sidebar-list-item {
    margin: 0;
}
.sidebar-list-item a,
.sidebar-board-btn {
    display: flex;
    align-items: center;
    gap: 0.7em;
    width: 100%;
    padding: 0.52em 0.3em;
    text-decoration: none;
    color: var(--color-text, #253a5d);
    border-radius: 7px;
    font-size: 1.025em;
    transition: background 0.15s, color 0.16s;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
}
.sidebar-list-item a.active,
.sidebar-list-item a:focus,
.sidebar-list-item a:hover,
.sidebar-board-btn:focus,
.sidebar-board-btn:hover {
    background: var(--color-bg-2, #f1f7fa);
    color: var(--brand-primary, #276EF1);
}
.sidebar-dot {
    width: 0.75em;
    height: 0.75em;
    background: var(--brand-primary, #276EF1);
    opacity: 0.7;
    border-radius: 50%;
    margin-right: 0.11em;
}
.sidebar-none,
.sidebar-loading {
    color: #999;
    font-size: .97em;
    margin: .4em 0 .5em .5em;
}
.actions {
    margin-top: auto;
    display: flex;
    gap: .7em;
    align-items: center;
    justify-content: flex-start;
    padding-bottom: .65em;
}
.sidebar-btn {
    background: var(--brand-accent, #F6BE00);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    padding: 0.48em 0.96em;
    margin-right: .13em;
    cursor: pointer;
    font-size: 1.05em;
    transition: background 0.2s, color 0.19s;
}
.sidebar-btn.theme-toggle {
    background: var(--color-bg-2, #f2f2f2);
    color: var(--brand-primary, #276EF1);
    min-width: 2.1em;
}
.sidebar-btn.theme-toggle:hover {
    background: var(--brand-accent, #F6BE00);
    color: #fff;
}
.sidebar-btn.logout {
    background: var(--brand-primary, #276EF1);
}
.sidebar-btn.logout:hover {
    background: #183A8E;
}
.sidebar-btn.login {
    background: var(--brand-secondary, #15C39A);
    color: #fff;
    text-decoration: none;
}
.sidebar-btn.login:hover {
    background: #0d8c6e;
    color: #fff;
}
.sidebar-btn:focus {
    outline: 2px solid var(--brand-primary);
}
.sidebar-toggle {
    position: fixed;
    z-index: 140;
    left: 1.2em;
    top: 1.13em;
    border: none;
    background: var(--brand-primary, #276EF1);
    color: #fff;
    border-radius: 7px;
    width: 2.4em;
    height: 2.4em;
    display: none;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 9px rgba(30,44,62,0.10);
    transition: background .16s;
}
.sidebar-toggle:focus,
.sidebar-toggle:hover {
    background: var(--brand-accent, #F6BE00);
    color: #fff;
}
.sidebar-overlay {
    position: fixed;
    z-index: 110;
    background: rgba(41,64,102,0.23);
    top: 0; left: 0; right: 0; bottom: 0;
}
@media (max-width: 860px) {
    .sidebar {
        width: 72vw;
        min-width: 196px;
        max-width: 328px;
        font-size: 0.97em;
    }
    .sidebar-toggle {
        display: flex;
    }
    .sidebar {
        box-shadow: 6px 0 24px 0 rgba(30,44,62,0.11);
    }
    .sidebar-mobile-close {
        display: block;
        background: none;
        border: none;
        font-size: 2.1em;
        color: var(--brand-primary, #276EF1);
        cursor: pointer;
        margin-left: auto;
    }
}
@media (max-width: 600px) {
    .sidebar {
        width: 83vw;
        min-width: 0;
        max-width: 99vw;
        font-size: 0.97em;
    }
    .profile-section, .sidebar-section { padding-left: .65em; padding-right: .65em;}
}
@media (min-width: 861px) {
    .sidebar {
        transform: translateX(0);
        position: sticky;
        left: 0;
    }
    .sidebar.open {transform: translateX(0);}
    .sidebar-toggle {
        display: none;
    }
    .sidebar-overlay {
        display: none;
    }
    .sidebar-mobile-close {
        display: none;
    }
}
</style>
