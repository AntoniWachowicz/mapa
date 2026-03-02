<script lang="ts">
  import type { PageData, ActionData } from './$types';

  interface Props { data: PageData; form?: ActionData | null; }
  const { data, form }: Props = $props();
</script>

<svelte:head>
  <title>Aktywacja konta - Mapa Builder</title>
</svelte:head>

<div class="container">
  <div class="card">
    <h1>Aktywacja konta</h1>
    <p>Ustaw hasło dla konta: <strong>{data.email}</strong></p>

    <form method="POST" action="?/activate">
      <input type="hidden" name="userId" value={data.userId} />
      <input type="hidden" name="key" value={data.key} />

      <label for="password">Hasło (min. 12 znaków)</label>
      <input id="password" name="password" type="password" required minlength="12" autocomplete="new-password" />

      <label for="confirm">Potwierdź hasło</label>
      <input id="confirm" name="confirm" type="password" required minlength="12" autocomplete="new-password" />

      {#if form?.error}
        <p class="error">{form.error}</p>
      {/if}

      <button type="submit">Aktywuj konto</button>
    </form>
  </div>
</div>

<style>
  .container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
  .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); width: 100%; max-width: 400px; }
  h1 { margin-bottom: 8px; color: #333; font-size: 22px; }
  p { color: #666; margin-bottom: 24px; }
  label { display: block; font-weight: 600; color: #333; margin-bottom: 4px; margin-top: 16px; }
  input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
  input:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 2px rgba(0,123,255,0.25); }
  button { width: 100%; margin-top: 24px; background: #007bff; color: white; border: none; padding: 12px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; }
  button:hover { background: #0056b3; }
  .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; border: 1px solid #f5c6cb; font-size: 14px; margin-top: 12px; }
</style>
