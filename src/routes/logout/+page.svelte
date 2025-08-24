<script lang="ts">
  // This is the logout page - it should redirect automatically
</script>

<svelte:head>
  <title>Wylogowywanie - Mapa Builder</title>
</svelte:head>

<div class="logout-page">
  <h1>Wylogowywanie...</h1>
  <p>Przekierowujemy Cię na stronę logowania.</p>
</div>

<style>
  .logout-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    text-align: center;
    background: #f9fafb;
  }
  
  .logout-page h1 {
    color: #1f2937;
    margin-bottom: 16px;
  }
  
  .logout-page p {
    color: #6b7280;
  }
</style>
