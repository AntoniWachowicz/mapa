<script lang="ts">
  import type { PageData } from './$types';
  const { data }: { data: PageData } = $props();

  const { tenant } = data;

  const statusLabel: Record<string, string> = { active: 'Aktywne', pending: 'Oczekuje', suspended: 'Zawieszone' };
  const statusClass: Record<string, string> = { active: 'badge-active', pending: 'badge-pending', suspended: 'badge-suspended' };

  function formatDate(d: Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  }
</script>

<div class="page">
  <div class="card">
    <h1>Twoje konto</h1>

    <dl class="info-grid">
      <dt>Firma</dt>
      <dd>{tenant.companyName}</dd>

      <dt>Email</dt>
      <dd>{tenant.email}</dd>

      <dt>Status</dt>
      <dd><span class="badge {statusClass[tenant.status] ?? ''}">{statusLabel[tenant.status] ?? tenant.status}</span></dd>

      <dt>Plan</dt>
      <dd>{tenant.plan}</dd>

      <dt>Opłacone do</dt>
      <dd>{formatDate(tenant.paidUntil)}</dd>

      <dt>Konto aktywne od</dt>
      <dd>{formatDate(tenant.activatedAt)}</dd>

      <dt>Tenant ID</dt>
      <dd><code class="mono">{tenant.tenantId}</code></dd>
    </dl>

    <p class="note">Tenant ID jest potrzebny do osadzenia mapy na zewnętrznej stronie.</p>
    <a href="/logout" class="btn-logout">Wyloguj się</a>
  </div>
</div>

<style>
  .page {
    min-height: calc(100vh - var(--nav-height, 48px));
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 16px;
    background: var(--color-background, #f5f5f5);
  }
  .card {
    background: white;
    border-radius: 8px;
    padding: 32px;
    max-width: 520px;
    width: 100%;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }
  h1 { margin: 0 0 24px; font-size: 1.4rem; }

  .info-grid {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 12px 16px;
    margin: 0 0 20px;
  }
  dt { font-weight: 600; font-size: 0.85rem; color: #555; align-self: center; }
  dd { margin: 0; font-size: 0.9rem; align-self: center; }

  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .badge-active   { background: #d4edda; color: #155724; }
  .badge-pending  { background: #fff3cd; color: #856404; }
  .badge-suspended { background: #f8d7da; color: #721c24; }

  .mono {
    font-family: monospace;
    font-size: 0.8rem;
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    word-break: break-all;
  }

  .note {
    font-size: 0.8rem;
    color: #888;
    margin: 0 0 20px;
  }

  .btn-logout {
    display: inline-block;
    padding: 8px 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
    color: #555;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .btn-logout:hover { color: #333; border-color: #999; }
</style>
