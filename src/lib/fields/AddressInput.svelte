<script lang="ts">
  import type { AddressData, AddressConfig } from '../types.js';

  interface Props {
    value: AddressData;
    config: AddressConfig;
    required?: boolean;
    oninput: (value: AddressData) => void;
    onGeocode?: () => void;
    showSyncWarning?: boolean;
  }

  const { value = {}, config, required = false, oninput, onGeocode, showSyncWarning = false }: Props = $props();

  function updateField(field: string, newValue: string) {
    const newAddress = { ...value, [field]: newValue };
    oninput(newAddress);
  }

  const fieldLabels: Record<string, string> = {
    street: 'Ulica',
    number: 'Numer',
    postalCode: 'Kod pocztowy',
    city: 'Miasto',
    gmina: 'Gmina'
  };
</script>

<div class="address-container">
  {#each config.displayFields as field}
    <div class="address-field">
      <input
        type="text"
        value={value[field as keyof AddressData] || ''}
        oninput={(e) => updateField(field, e.currentTarget.value)}
        required={config.requiredFields.includes(field)}
        class="address-input"
        placeholder={fieldLabels[field] + (config.requiredFields.includes(field) ? ' *' : '')}
      />
    </div>
  {/each}

  {#if config.enableGeocoding}
    <div class="geocode-actions">
      {#if onGeocode}
        <button
          type="button"
          onclick={onGeocode}
          class="geocode-btn"
        >
          🔍 Znajdź na mapie
        </button>
      {/if}

      {#if showSyncWarning}
        <div class="sync-warning">
          ⚠️ Adres nie zgadza się z lokalizacją
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .address-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .address-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .address-input {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
  }

  .address-input:focus {
    outline: none;
    border-color: #007acc;
  }

  .geocode-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .geocode-btn {
    background: #000000;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    align-self: flex-start;
  }

  .geocode-btn:hover {
    background: #1a1a1a;
  }

  .sync-warning {
    color: #dc2626;
    font-size: 14px;
    padding: 8px;
    background: #fef2f2;
    border-radius: 4px;
    border-left: 4px solid #dc2626;
  }
</style>
