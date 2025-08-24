<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  
  interface Props {
    form?: {
      error?: string;
    } | null;
  }
  
  const { form }: Props = $props();
  
  let loading = $state(false);
</script>

<svelte:head>
  <title>Logowanie - Mapa Builder</title>
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <h1>🗺️ Mapa Builder</h1>
    <h2>Proszę się zalogować</h2>
    
    <form 
      method="POST" 
      action="?/login" 
      use:enhance={({ formElement, formData, action, cancel, submitter }) => {
        loading = true;
        
        return async ({ result, update }) => {
          loading = false;
          
          if (result.type === 'redirect') {
            goto(result.location);
          } else {
            await update();
          }
        };
      }}
    >
      <div class="form-group">
        <label for="username">Nazwa użytkownika:</label>
        <input 
          id="username"
          name="username" 
          type="text" 
          required 
          disabled={loading}
          autocomplete="username"
        >
      </div>
      
      <div class="form-group">
        <label for="password">Hasło:</label>
        <input 
          id="password"
          name="password" 
          type="password" 
          required 
          disabled={loading}
          autocomplete="current-password"
        >
      </div>
      
      {#if form?.error}
        <div class="error-message">
          {form.error}
        </div>
      {/if}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logowanie...' : 'Zaloguj się'}
      </button>
    </form>
    
    <p class="help-text">
      Skontaktuj się z administratorem jeśli potrzebujesz danych dostępowych.
    </p>
  </div>
</div>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
  }
  
  .login-card {
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    width: 100%;
    max-width: 400px;
  }
  
  h1 {
    text-align: center;
    margin-bottom: 10px;
    color: #333;
    font-size: 24px;
  }
  
  h2 {
    text-align: center;
    margin-bottom: 30px;
    color: #666;
    font-weight: 400;
    font-size: 18px;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #333;
  }
  
  input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  
  input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
  }
  
  input:disabled {
    background: #f8f9fa;
    opacity: 0.7;
  }
  
  button {
    width: 100%;
    background: #007bff;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  button:hover:not(:disabled) {
    background: #0056b3;
  }
  
  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .error-message {
    background: #f8d7da;
    color: #721c24;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    border: 1px solid #f5c6cb;
    font-size: 14px;
  }
  
  .help-text {
    text-align: center;
    color: #666;
    font-size: 12px;
    margin-top: 20px;
  }
</style>