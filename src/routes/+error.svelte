<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Błąd {$page.status} - Mapa Builder</title>
</svelte:head>

<div class="error-container">
  <div class="error-card">
    <div class="error-icon">
      {#if $page.status === 404}
        🔍
      {:else if $page.status === 403}
        🔒
      {:else if $page.status === 500}
        ⚠️
      {:else}
        ❌
      {/if}
    </div>

    <h1>Błąd {$page.status}</h1>

    <p class="error-message">
      {#if $page.status === 404}
        Nie znaleziono strony. Sprawdź czy adres jest poprawny.
      {:else if $page.status === 403}
        Brak dostępu. Zaloguj się aby kontynuować.
      {:else if $page.status === 500}
        Wystąpił błąd serwera. Spróbuj ponownie później.
      {:else}
        {$page.error?.message || 'Wystąpił nieoczekiwany błąd.'}
      {/if}
    </p>

    <div class="error-actions">
      <a href="/" class="btn btn-primary">Strona główna</a>
      <button onclick={() => history.back()} class="btn btn-secondary">Wróć</button>
    </div>

    {#if import.meta.env.DEV && $page.error?.message}
      <details class="error-details">
        <summary>Szczegóły błędu (dev)</summary>
        <pre>{$page.error.message}</pre>
      </details>
    {/if}
  </div>
</div>

<style>
  .error-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
  }

  .error-card {
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    width: 100%;
    max-width: 450px;
    text-align: center;
  }

  .error-icon {
    font-size: 64px;
    margin-bottom: 20px;
  }

  h1 {
    color: #333;
    font-size: 28px;
    margin-bottom: 15px;
  }

  .error-message {
    color: #666;
    font-size: 16px;
    margin-bottom: 30px;
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    border: none;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background: #0056b3;
  }

  .btn-secondary {
    background: #f8f9fa;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn-secondary:hover {
    background: #e9ecef;
  }

  .error-details {
    margin-top: 30px;
    text-align: left;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
  }

  .error-details summary {
    cursor: pointer;
    color: #666;
    font-size: 12px;
    margin-bottom: 10px;
  }

  .error-details pre {
    font-size: 12px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: #721c24;
    margin: 0;
  }
</style>
