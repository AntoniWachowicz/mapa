<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();

  let navTabs: HTMLUListElement;
  let indicator: HTMLDivElement;

  function updateIndicator() {
    if (!navTabs || !indicator) {
      console.log('Missing elements:', { navTabs: !!navTabs, indicator: !!indicator });
      return;
    }

    const activeTab = navTabs.querySelector('.nav-tab.active') as HTMLElement;
    if (activeTab) {
      const tabsContainer = navTabs;
      const containerRect = tabsContainer.getBoundingClientRect();
      const activeRect = activeTab.getBoundingClientRect();

      const left = activeRect.left - containerRect.left;
      const width = activeRect.width;

      console.log('Updating indicator:', { left, width, pathname: $page.url.pathname });

      indicator.style.transform = `translateX(${left}px)`;
      indicator.style.width = `${width}px`;
      indicator.style.opacity = '1';
    } else {
      console.log('No active tab found for:', $page.url.pathname);
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

<nav class="nav">
  <ul class="nav-tabs" bind:this={navTabs}>
    <li><a href="/map" class="nav-tab" class:active={$page.url.pathname === '/map'}>Mapa</a></li>
    <li><a href="/" class="nav-tab" class:active={$page.url.pathname === '/'}>Lista</a></li>
    <li><a href="/admin" class="nav-tab" class:active={$page.url.pathname === '/admin'}>Konfiguracja</a></li>
    <li><a href="/schema-builder" class="nav-tab" class:active={$page.url.pathname === '/schema-builder'}>Schemat</a></li>
    <div class="nav-indicator" bind:this={indicator}></div>
  </ul>
</nav>

<main>
  {@render children()}
</main>

<style>
  main {
    flex: 1;
    background: var(--color-background);
    min-height: calc(100vh - var(--nav-height));
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