<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  import type { AuthUser } from '$lib/types';

  interface Props {
    children: import('svelte').Snippet;
    data: { user?: AuthUser | null };
  }

  const { children, data }: Props = $props();
  const user = $derived(data.user);

  const isEmbed = $derived($page.url.pathname.startsWith('/embed'));

  let navTabs = $state<HTMLUListElement>(null!);
  let indicator = $state<HTMLDivElement>(null!);

  function updateIndicator() {
    if (!navTabs || !indicator) {
      return;
    }

    const activeTab = navTabs.querySelector('.nav-tab.active') as HTMLElement;
    if (activeTab) {
      const tabsContainer = navTabs;
      const containerRect = tabsContainer.getBoundingClientRect();
      const activeRect = activeTab.getBoundingClientRect();

      const left = activeRect.left - containerRect.left;
      const width = activeRect.width;

      indicator.style.transform = `translateX(${left}px)`;
      indicator.style.width = `${width}px`;
      indicator.style.opacity = '1';
    }
  }

  onMount(() => {
    updateIndicator();
  });

  // Update indicator when page changes
  $effect(() => {
    $page.url.pathname; // Subscribe to pathname changes
    // Use setTimeout to ensure DOM has updated
    setTimeout(updateIndicator, 0);
  });
</script>

{#if !isEmbed}
  <nav class="nav">
    <ul class="nav-tabs" bind:this={navTabs}>
      {#if user?.role === 'superadmin'}
        <li><a href="/superadmin" class="nav-tab" class:active={$page.url.pathname.startsWith('/superadmin')}>Platform</a></li>
      {:else if user}
        <li><a href="/map" class="nav-tab" class:active={$page.url.pathname === '/map'}>Mapa</a></li>
        <li><a href="/list" class="nav-tab" class:active={$page.url.pathname === '/list'}>Lista</a></li>
        <li><a href="/admin" class="nav-tab" class:active={$page.url.pathname === '/admin'}>Konfiguracja</a></li>
        <li><a href="/schema-builder" class="nav-tab" class:active={$page.url.pathname === '/schema-builder'}>Schemat</a></li>
        <li><a href="/admin/embed-code" class="nav-tab" class:active={$page.url.pathname === '/admin/embed-code'}>Osadź</a></li>
      {/if}
      <div class="nav-indicator" bind:this={indicator}></div>
    </ul>
    <div class="nav-auth">
      {#if user}
        {#if user.role === 'superadmin'}
          <span class="nav-email">{user.email}</span>
        {:else}
          <a href="/account" class="nav-email">{user.email}</a>
        {/if}
        <a href="/logout" class="nav-logout">Wyloguj</a>
      {:else}
        <a href="/login" class="nav-login">Zaloguj się</a>
      {/if}
    </div>
  </nav>
{/if}

<main class:embed={isEmbed}>
  {@render children()}
</main>

<style>
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-auth {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-right: 16px;
    white-space: nowrap;
  }

  .nav-email {
    font-size: 0.8rem;
    color: var(--color-text-muted, #888);
    text-decoration: none;
  }
  .nav-email:hover { color: #333; }

  .nav-login, .nav-logout {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 4px;
    text-decoration: none;
    transition: background 0.15s;
  }

  .nav-login {
    background: var(--color-primary, #007bff);
    color: white;
  }

  .nav-login:hover { background: #0056b3; }

  .nav-logout {
    background: transparent;
    color: var(--color-text-muted, #888);
    border: 1px solid currentColor;
  }

  .nav-logout:hover { color: #333; }

  main {
    flex: 1;
    background: var(--color-background);
    min-height: calc(100vh - var(--nav-height));
  }

  main.embed {
    min-height: 100vh;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
  }

  :global(#app) {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>