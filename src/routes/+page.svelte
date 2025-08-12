<script lang="ts">
  interface Props {
    data: {
      user?: {
        username: string;
      } | null;
    };
  }
  
  const { data }: Props = $props();
</script>

<svelte:head>
  <title>Map Builder - Home</title>
</svelte:head>

<div class="home-container">
  <h1>🗺️ Welcome to Map Builder</h1>
  
  {#if data.user}
    <div class="welcome-message">
      <h2>Hello, {data.user.username}! 👋</h2>
      <p>Your map building application is ready to use.</p>
    </div>
    
    <div class="quick-actions">
      <h3>Quick Actions</h3>
      
      <div class="action-cards">
        <a href="/schema-builder" class="action-card">
          <div class="card-icon">📝</div>
          <h4>Schema Builder</h4>
          <p>Create and manage your data fields</p>
        </a>
        
        <a href="/map" class="action-card">
          <div class="card-icon">📍</div>
          <h4>Map View</h4>
          <p>Add pins and view your map</p>
        </a>
        
        <a href="/admin" class="action-card">
          <div class="card-icon">🔧</div>
          <h4>Admin Settings</h4>
          <p>Configure map bounds and settings</p>
        </a>
      </div>
    </div>
  {:else}
    <div class="login-prompt">
      <p>Please <a href="/login">sign in</a> to access the application.</p>
    </div>
  {/if}
</div>

<style>
  .home-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  
  h1 {
    text-align: center;
    font-size: 36px;
    margin-bottom: 40px;
    color: #333;
  }
  
  .welcome-message {
    text-align: center;
    margin-bottom: 60px;
  }
  
  .welcome-message h2 {
    color: #007bff;
    margin-bottom: 10px;
  }
  
  .welcome-message p {
    color: #666;
    font-size: 18px;
  }
  
  .quick-actions h3 {
    text-align: center;
    margin-bottom: 30px;
    color: #333;
  }
  
  .action-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
  }
  
  .action-card {
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s, box-shadow 0.2s;
    text-align: center;
  }
  
  .action-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  }
  
  .card-icon {
    font-size: 48px;
    margin-bottom: 20px;
  }
  
  .action-card h4 {
    margin-bottom: 10px;
    color: #333;
    font-size: 20px;
  }
  
  .action-card p {
    color: #666;
    font-size: 14px;
    margin: 0;
  }
  
  .login-prompt {
    text-align: center;
    padding: 60px 20px;
    background: #f8f9fa;
    border-radius: 12px;
  }
  
  .login-prompt p {
    font-size: 18px;
    color: #666;
  }
  
  .login-prompt a {
    color: #007bff;
    text-decoration: none;
    font-weight: 600;
  }
  
  .login-prompt a:hover {
    text-decoration: underline;
  }
</style>