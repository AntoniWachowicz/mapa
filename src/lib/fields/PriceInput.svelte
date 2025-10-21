<script lang="ts">
  import type { PriceData, PriceConfig, FundingSource } from '../types.js';

  interface Props {
    value: PriceData;
    config: PriceConfig;
    required?: boolean;
    oninput: (value: PriceData) => void;
  }

  const { value, config, required = false, oninput }: Props = $props();

  // Ensure value has proper structure
  let priceData = $state<PriceData>(value || {
    currency: config.currency || 'PLN',
    funding: [],
    showTotal: config.showTotal ?? true,
    showBreakdown: config.showPercentages ?? true
  });

  $effect(() => {
    // Update priceData with calculated total and notify parent
    const calculatedTotal = calculateTotal(priceData.funding);
    const updatedData = { ...priceData, total: calculatedTotal };
    oninput(updatedData);
  });

  function addFundingSource() {
    priceData = {
      ...priceData,
      funding: [...priceData.funding, { source: '', amount: 0 }]
    };
  }

  function removeFundingSource(index: number) {
    priceData = {
      ...priceData,
      funding: priceData.funding.filter((_, i) => i !== index)
    };
  }

  function updateFundingSource(index: number, field: 'source' | 'amount' | 'percentage', newValue: any) {
    const newFunding = [...priceData.funding];
    if (field === 'amount') {
      newFunding[index] = { ...newFunding[index], amount: parseFloat(newValue) || 0 };
    } else if (field === 'percentage') {
      newFunding[index] = { ...newFunding[index], percentage: parseInt(newValue) || undefined };
    } else {
      newFunding[index] = { ...newFunding[index], source: newValue };
    }
    priceData = { ...priceData, funding: newFunding };
  }

  function calculateTotal(funding: FundingSource[]): number {
    return funding.reduce((sum, f) => sum + (f.amount || 0), 0);
  }

  function calculatePercentage(funding: FundingSource[], amount: number): number {
    const total = calculateTotal(funding);
    if (total === 0) return 0;
    return Math.round((amount / total) * 100);
  }

  const total = $derived(calculateTotal(priceData.funding));
</script>

<div class="price-container">
  {#each priceData.funding as source, i}
    <div class="funding-row">
      <div class="funding-source-row">
        <select
          value={source.source}
          onchange={(e) => updateFundingSource(i, 'source', e.currentTarget.value)}
          class="funding-source"
        >
          <option value="">Wybierz źródło</option>
          {#each config.defaultFundingSources as defaultSource}
            <option value={defaultSource}>{defaultSource}</option>
          {/each}
          <option value="Inny">Inny</option>
        </select>

        <button
          type="button"
          onclick={() => removeFundingSource(i)}
          class="remove-btn"
        >
          ✕
        </button>
      </div>

      <div class="funding-amount-row">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
          <input
            type="number"
            step="0.01"
            value={source.amount}
            oninput={(e) => updateFundingSource(i, 'amount', e.currentTarget.value)}
            placeholder="Kwota"
            class="funding-amount"
          />
          <span class="currency">{config.currency}</span>
        </div>

        {#if config.showPercentages}
          <div style="display: flex; align-items: center; gap: 8px;">
            <input
              type="number"
              min="0"
              max="100"
              value={source.percentage ?? calculatePercentage(priceData.funding, source.amount)}
              oninput={(e) => updateFundingSource(i, 'percentage', e.currentTarget.value)}
              placeholder="%"
              class="funding-percentage"
            />
            <span>%</span>
          </div>
        {/if}
      </div>
    </div>
  {/each}

  <button
    type="button"
    onclick={addFundingSource}
    class="add-btn"
  >
    + Dodaj źródło finansowania
  </button>

  {#if config.showTotal && total > 0}
    <div class="total-row">
      <strong>Suma:</strong>
      <span>{total.toFixed(2)} {config.currency}</span>
    </div>
  {/if}
</div>

<style>
  .price-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .funding-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 4px;
    border: 1px solid #e5e5e5;
  }

  .funding-source-row,
  .funding-amount-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .funding-source-row {
    flex-wrap: wrap;
  }

  .funding-amount-row {
    justify-content: space-between;
  }

  .funding-source {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    flex: 1;
    min-width: 0;
  }

  .funding-amount,
  .funding-percentage {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    width: 100px;
  }

  .funding-source:focus,
  .funding-amount:focus,
  .funding-percentage:focus {
    outline: none;
    border-color: #007acc;
  }

  .currency {
    font-size: 14px;
    color: #666;
  }

  .remove-btn {
    background: #dc2626;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
  }

  .remove-btn:hover {
    background: #b91c1c;
  }

  .add-btn {
    background: #000000;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    align-self: flex-start;
  }

  .add-btn:hover {
    background: #1a1a1a;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 16px;
  }
</style>
