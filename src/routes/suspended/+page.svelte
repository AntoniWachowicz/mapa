<div class="page">
  <div class="card">
    <h1>Konto zawieszone</h1>
    <p>Dostęp do Twojego konta został tymczasowo zawieszony.</p>
    <p>Jeśli uważasz, że to pomyłka lub chcesz wznowić subskrypcję, skontaktuj się z nami.</p>
    <a href="/logout" class="btn">Wyloguj się</a>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-background, #f5f5f5);
  }
  .card {
    background: white;
    border-radius: 8px;
    padding: 40px;
    max-width: 480px;
    text-align: center;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  }
  h1 { margin: 0 0 16px; font-size: 1.5rem; color: #721c24; }
  p { color: #555; line-height: 1.6; margin: 0 0 12px; }
  .btn {
    display: inline-block;
    margin-top: 16px;
    padding: 10px 24px;
    background: var(--color-primary, #007bff);
    color: white;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 600;
  }
  .btn:hover { background: #0056b3; }
</style>
