<script lang="ts">
  interface Props {
    children: import('svelte').Snippet;
  }
  
  const { children }: Props = $props();
</script>

<nav>
  <a href="/">Home</a>
  <a href="/schema-builder">Schema Builder</a>
  <a href="/map">Map View</a>
  <a href="/admin">🔧 Admin</a>
</nav>

<main>
  {@render children()}
</main>

<style>
  nav {
    background: #f8f9fa;
    padding: 10px 20px;
    border-bottom: 1px solid #dee2e6;
  }
  
  nav a {
    margin-right: 15px;
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