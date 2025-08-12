<script lang="ts">
  import type { LayoutData } from './$types.js';
  
  interface Props {
    children: import('svelte').Snippet;
    data: LayoutData;
  }
  
  const { children, data }: Props = $props();
</script>

{#if data.user}
  <nav>
    <div class="nav-left">
      <a href="/">Home</a>
      <a href="/schema-builder">Schema Builder</a>
      <a href="/map">Map View</a>
      <a href="/admin">🔧 Admin</a>
    </div>
    
    <div class="nav-right">
      <span class="user-info">👤 {data.user.username}</span>
      <a href="/logout" class="logout-link">Logout</a>
    </div>
  </nav>
{/if}

<main>
  {@render children()}
</main>

<style>
  nav {
    background: #f8f9fa;
    padding: 10px 20px;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .nav-left {
    display: flex;
    gap: 15px;
  }
  
  .nav-right {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  nav a {
    text-decoration: none;
    color: #333;
    font-weight: 500;
  }
  
  nav a:hover {
    color: #007bff;
  }
  
  nav a[href="/admin"] {
    color: #dc3545;
    font-weight: 600;
  }
  
  .user-info {
    color: #666;
    font-size: 14px;
  }
  
  .logout-link {
    color: #dc3545 !important;
    font-weight: 600;
  }
  
  main {
    flex: 1;
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
