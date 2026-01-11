<script lang="ts">
  import type { Template } from '$lib/types.js';
  import Modal from './Modal.svelte';

  interface Props {
    open: boolean;
    columnName: string;
    template: Template | null;
    onclose: () => void;
    oncreated: (fieldKey: string, newField: any) => void;
  }

  const { open, columnName, template, onclose, oncreated }: Props = $props();

  let fieldName = $state(columnName);
  let fieldType = $state('richtext');
  let creating = $state(false);

  // Reset form when modal opens with new column
  $effect(() => {
    if (open) {
      fieldName = columnName;
      fieldType = 'richtext';
      creating = false;
    }
  });

  async function handleCreate() {
    if (!fieldName.trim() || !template) {
      alert('Nazwa pola jest wymagana');
      return;
    }

    creating = true;

    try {
      // Create field key from name
      const fieldKey = fieldName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      // Create new field object
      const newField = {
        id: crypto.randomUUID(),
        key: fieldKey,
        fieldName: fieldName,
        label: fieldName,
        displayLabel: fieldName,
        type: fieldType,
        fieldType: fieldType,
        required: false,
        visible: true,
        adminVisible: true,
        order: (template.fields?.length || 0) + 1
      };

      // Update template via schema-builder form action
      const updatedTemplate = {
        ...template,
        fields: [...(template.fields || []), newField]
      };

      const formData = new FormData();
      formData.set('template', JSON.stringify(updatedTemplate));

      const response = await fetch('/schema-builder?/updateTemplate', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create field');
      }

      // Notify parent of successful creation
      oncreated(fieldKey, newField);

      // Ask if user wants to configure the field in schema builder
      const configure = confirm(
        `Pole "${fieldName}" zostało utworzone i zmapowane do kolumny "${columnName}".\n\n` +
        `Czy chcesz przejść do konstruktora schematu aby skonfigurować to pole?\n` +
        `(Kliknij "Anuluj" aby kontynuować import)`
      );

      if (configure) {
        window.location.href = '/schema-builder';
      }
    } catch (error) {
      console.error('Error creating field:', error);
      alert('Błąd podczas tworzenia pola');
    } finally {
      creating = false;
    }
  }

  function handleClose() {
    if (!creating) {
      onclose();
    }
  }
</script>

<Modal
  {open}
  title="Utwórz nowe pole"
  showCloseButton={!creating}
  closeOnOverlayClick={!creating}
  closeOnEscape={!creating}
  onclose={handleClose}
  zIndex={1100}
  maxWidth="500px"
>
  <p class="modal-info">
    Pole zostanie dodane do schematu i zmapowane do kolumny "<strong>{columnName}</strong>"
  </p>

  <div class="form">
    <div class="form-group">
      <label for="newFieldName">Nazwa pola:</label>
      <input
        id="newFieldName"
        type="text"
        bind:value={fieldName}
        placeholder="np. Data rozpoczęcia"
        disabled={creating}
      />
    </div>

    <div class="form-group">
      <label for="newFieldType">Typ pola:</label>
      <select
        id="newFieldType"
        bind:value={fieldType}
        disabled={creating}
      >
        <option value="richtext">Tekst sformatowany</option>
        <option value="files">Pliki</option>
        <option value="gallery">Galeria</option>
        <option value="multidate">Daty</option>
        <option value="address">Adres</option>
        <option value="links">Linki</option>
        <option value="price">Cena</option>
        <option value="category">Kategoria</option>
        <option value="tags">Tagi</option>
      </select>
    </div>
  </div>

  {#if creating}
    <div class="loading">
      <div class="spinner"></div>
      <p>Tworzenie pola...</p>
    </div>
  {/if}

  {#snippet footer()}
    <div class="actions">
      <button
        class="btn btn-primary"
        onclick={handleCreate}
        disabled={creating || !fieldName.trim()}
      >
        Utwórz pole
      </button>
      <button
        class="btn btn-secondary"
        onclick={handleClose}
        disabled={creating}
      >
        Anuluj
      </button>
    </div>
  {/snippet}
</Modal>

<style>
  .modal-info {
    margin: 0 0 var(--space-4) 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .form {
    margin-bottom: var(--space-4);
  }

  .form-group {
    margin-bottom: var(--space-4);
  }

  .form-group label {
    display: block;
    margin-bottom: var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .form-group input[type="text"],
  .form-group select {
    width: 100%;
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }

  .form-group input[type="text"]:focus,
  .form-group select:focus {
    outline: none;
    border-color: #0ea5e9;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) 0;
  }

  .loading p {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: #333333;
    color: white;
    border: none;
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn:hover {
    background: #444444;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #6b7280;
  }

  .btn-secondary:hover {
    background: #4b5563;
  }
</style>
