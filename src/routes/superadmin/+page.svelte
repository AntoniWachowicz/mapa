<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  interface Props { data: PageData & { pinCounts: Record<string, number> }; form: ActionData; }
  const { data, form }: Props = $props();

  let showCreateForm = $state(false);
  let editingId = $state<string | null>(null);

  const statusLabel: Record<string, string> = { active: 'Aktywne', pending: 'Oczekuje', suspended: 'Zawieszone' };
  const statusClass: Record<string, string> = { active: 'badge-active', pending: 'badge-pending', suspended: 'badge-suspended' };

  function formatDate(d: Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pl-PL');
  }

  // Auto-show create form result
  $effect(() => {
    if (form?.created) showCreateForm = false;
  });
</script>

<div class="page">
  <header class="page-header">
    <h1>Panel platformy</h1>
    <button class="btn-primary" onclick={() => (showCreateForm = !showCreateForm)}>
      {showCreateForm ? 'Anuluj' : '+ Nowy klient'}
    </button>
  </header>

  {#if showCreateForm}
    <section class="create-section">
      <h2>Utwórz konto klienta</h2>
      <form method="POST" action="?/create" use:enhance class="create-form">
        <div class="field-row">
          <label>
            Email
            <input type="email" name="email" required placeholder="klient@firma.pl" />
          </label>
          <label>
            Nazwa firmy
            <input type="text" name="companyName" required placeholder="np. LGD Razem" />
          </label>
          <button type="submit" class="btn-primary">Utwórz</button>
        </div>
        {#if form && 'error' in form && !form.created}<p class="form-error">{form.error}</p>{/if}
      </form>
    </section>
  {/if}

  {#if form?.created}
    <div class="activation-box">
      <strong>Konto utworzone dla {form.email}</strong>
      <p>Wyślij klientowi poniższy link aktywacyjny:</p>
      <code class="activation-link">{`${typeof window !== 'undefined' ? window.location.origin : ''}/activate?key=${form.activationKey}`}</code>
      <p class="hint">Tenant ID: <code>{form.tenantId}</code></p>
    </div>
  {/if}

  <table class="tenant-table">
    <thead>
      <tr>
        <th>Firma</th>
        <th>Email</th>
        <th>Status</th>
        <th>Plan</th>
        <th>Opłacone do</th>
        <th>Pinów</th>
        <th>Utworzone</th>
        <th>Akcje</th>
      </tr>
    </thead>
    <tbody>
      {#each data.tenants as tenant (tenant.userId)}
        <tr class:editing={editingId === tenant.userId}>
          <td>
            {#if editingId === tenant.userId}
              <form method="POST" action="?/updateMeta" use:enhance onsubmit={() => (editingId = null)}>
                <input type="hidden" name="userId" value={tenant.userId} />
                <input type="text" name="companyName" value={tenant.companyName} class="inline-input" />
                <select name="plan" class="inline-select">
                  {#each ['basic', 'pro', 'enterprise'] as p}
                    <option value={p} selected={tenant.plan === p}>{p}</option>
                  {/each}
                </select>
                <input type="date" name="paidUntil" value={tenant.paidUntil ? new Date(tenant.paidUntil).toISOString().slice(0,10) : ''} class="inline-input" />
                <button type="submit" class="btn-sm btn-save">Zapisz</button>
                <button type="button" class="btn-sm" onclick={() => (editingId = null)}>Anuluj</button>
              </form>
            {:else}
              {tenant.companyName}
            {/if}
          </td>
          <td>{tenant.email}</td>
          <td><span class="badge {statusClass[tenant.status] ?? ''}">{statusLabel[tenant.status] ?? tenant.status}</span></td>
          <td>{editingId === tenant.userId ? '' : tenant.plan}</td>
          <td>{editingId === tenant.userId ? '' : formatDate(tenant.paidUntil)}</td>
          <td>{data.pinCounts[tenant.tenantId] ?? 0}</td>
          <td>{formatDate(tenant.createdAt)}</td>
          <td class="actions">
            {#if editingId !== tenant.userId}
              <button class="btn-sm" onclick={() => (editingId = tenant.userId)}>Edytuj</button>
              {#if tenant.status !== 'suspended'}
                <form method="POST" action="?/setStatus" use:enhance>
                  <input type="hidden" name="userId" value={tenant.userId} />
                  <input type="hidden" name="status" value="suspended" />
                  <button type="submit" class="btn-sm btn-danger">Zawieś</button>
                </form>
              {:else}
                <form method="POST" action="?/setStatus" use:enhance>
                  <input type="hidden" name="userId" value={tenant.userId} />
                  <input type="hidden" name="status" value="active" />
                  <button type="submit" class="btn-sm btn-success">Aktywuj</button>
                </form>
              {/if}
            {/if}
          </td>
        </tr>
      {/each}
      {#if data.tenants.length === 0}
        <tr><td colspan="8" class="empty">Brak klientów.</td></tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  .page { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  h1 { margin: 0; font-size: 1.5rem; }
  h2 { margin: 0 0 12px; font-size: 1.1rem; }

  .create-section {
    background: var(--color-surface, #f8f8f8);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
  }

  .create-form .field-row {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .create-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .create-form input {
    padding: 6px 10px;
    border: 1px solid var(--color-border, #ccc);
    border-radius: 4px;
    font-size: 0.9rem;
    min-width: 200px;
  }

  .form-error { color: #c00; font-size: 0.85rem; margin-top: 8px; }

  .activation-box {
    background: #eaffea;
    border: 1px solid #6c6;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
    font-size: 0.9rem;
  }
  .activation-link {
    display: block;
    word-break: break-all;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    margin: 8px 0;
    font-size: 0.8rem;
  }
  .hint { color: #555; font-size: 0.8rem; margin: 4px 0 0; }

  .tenant-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .tenant-table th, .tenant-table td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-border, #e0e0e0);
  }
  .tenant-table th { font-weight: 600; background: var(--color-surface, #f5f5f5); }
  .tenant-table tr.editing { background: #fffbe6; }
  .empty { text-align: center; color: #888; padding: 32px; }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .badge-active   { background: #d4edda; color: #155724; }
  .badge-pending  { background: #fff3cd; color: #856404; }
  .badge-suspended { background: #f8d7da; color: #721c24; }

  .actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .actions form { margin: 0; }

  .inline-input {
    padding: 4px 8px;
    border: 1px solid var(--color-border, #ccc);
    border-radius: 4px;
    font-size: 0.85rem;
    width: auto;
  }
  .inline-select {
    padding: 4px 6px;
    border: 1px solid var(--color-border, #ccc);
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .btn-primary {
    background: var(--color-primary, #007bff);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-primary:hover { background: #0056b3; }

  .btn-sm {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--color-border, #ccc);
    background: transparent;
  }
  .btn-sm:hover { background: #f0f0f0; }
  .btn-save { border-color: #28a745; color: #28a745; }
  .btn-save:hover { background: #d4edda; }
  .btn-danger { border-color: #dc3545; color: #dc3545; }
  .btn-danger:hover { background: #f8d7da; }
  .btn-success { border-color: #28a745; color: #28a745; }
  .btn-success:hover { background: #d4edda; }
</style>
