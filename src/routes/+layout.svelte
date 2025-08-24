<script lang="ts">
  interface Props {
    children: import('svelte').Snippet;
  }
  
  const { children }: Props = $props();
</script>

<nav>
  <a href="/">Strona Główna</a>
  <a href="/schema-builder">Kreator Schematu</a>
  <a href="/map">Widok Mapy</a>
  <a href="/admin">🔧 Admin</a>
</nav>

<main>
  {@render children()}
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  
  nav {
    background: #ffffff;
    padding: 24px 32px;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  
  nav a {
    margin-right: 32px;
    text-decoration: none;
    color: #374151;
    font-weight: 500;
    font-size: 15px;
    transition: color 0.2s ease;
    position: relative;
  }
  
  nav a:hover {
    color: #1f2937;
  }
  
  
  nav a[href="/admin"] {
    color: #dc2626;
    font-weight: 600;
  }
  
  nav a[href="/admin"]:hover {
    color: #991b1b;
  }
  
  main {
    flex: 1;
    background: #f9fafb;
  }
  
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1f2937;
    line-height: 1.6;
  }
  
  :global(#app) {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  :global(h1, h2, h3, h4, h5, h6) {
    font-weight: 600;
    color: #111827;
    margin: 0 0 16px 0;
  }
  
  :global(h1) {
    font-size: 28px;
    margin-bottom: 24px;
  }
  
  :global(h2) {
    font-size: 24px;
    margin-bottom: 20px;
  }
  
  :global(button) {
    font-family: inherit;
  }
  
  :global(input, select, textarea) {
    font-family: inherit;
  }
</style>