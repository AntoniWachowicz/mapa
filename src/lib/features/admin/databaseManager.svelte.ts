/**
 * Database Manager Module
 * Manages database operations for admin page: cleanup, reset, and seeding.
 * Uses Svelte 5 runes for reactive state management.
 */

/**
 * Creates and manages database operation state and actions.
 */
export function createDatabaseManager() {
  // Cleanup state
  let cleaningUp = $state(false);
  let cleanupMessage = $state('');

  // Reset state
  let resetting = $state(false);
  let resetMessage = $state('');
  let showResetConfirm = $state(false);

  // Seeding state
  let seeding = $state(false);
  let seedMessage = $state('');
  let showSeedConfirm = $state(false);
  let clearBeforeSeed = $state(false);
  let objectCount = $state<number | null>(null);

  /**
   * Cleanup unused map tiles
   */
  async function cleanupUnusedTiles(): Promise<void> {
    if (!confirm('This will delete all unused map files and tiles. Current map will be preserved. Continue?')) {
      return;
    }

    cleaningUp = true;
    cleanupMessage = '';

    try {
      const response = await fetch('/api/cleanup-tiles', {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cleanup tiles');
      }

      cleanupMessage = result.message;
    } catch (error) {
      console.error('Cleanup error:', error);
      cleanupMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      cleaningUp = false;
    }
  }

  /**
   * Initiate database reset (show confirmation)
   */
  function initiateReset(): void {
    showResetConfirm = true;
  }

  /**
   * Cancel database reset
   */
  function cancelReset(): void {
    showResetConfirm = false;
  }

  /**
   * Confirm and execute database reset
   */
  async function confirmReset(): Promise<void> {
    showResetConfirm = false;
    resetting = true;
    resetMessage = '';

    try {
      const response = await fetch('/api/reset-database', {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset database');
      }

      resetMessage = result.message || 'Baza danych została zresetowana pomyślnie!';

      // Reload page after successful reset to show fresh state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Reset error:', error);
      resetMessage = `Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`;
    } finally {
      resetting = false;
    }
  }

  /**
   * Fetch current object count from database
   */
  async function fetchObjectCount(): Promise<void> {
    try {
      const response = await fetch('/api/objects');
      const result = await response.json();
      objectCount = result.objects?.length || 0;
    } catch (error) {
      console.error('Error fetching object count:', error);
      objectCount = 0;
    }
  }

  /**
   * Initiate database seeding (show confirmation)
   */
  function initiateSeed(): void {
    fetchObjectCount();
    showSeedConfirm = true;
  }

  /**
   * Cancel database seeding
   */
  function cancelSeed(): void {
    showSeedConfirm = false;
    clearBeforeSeed = false;
  }

  /**
   * Confirm and execute database seeding
   */
  async function confirmSeed(): Promise<void> {
    showSeedConfirm = false;
    seeding = true;
    seedMessage = '';

    try {
      const url = clearBeforeSeed ? '/api/seed?clear=true' : '/api/seed';
      const response = await fetch(url, {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok && !result.success) {
        if (result.currentCount) {
          seedMessage = `Baza danych zawiera już ${result.currentCount} obiektów. Użyj opcji "Wyczyść przed zasiewem" aby rozpocząć od nowa.`;
        } else {
          throw new Error(result.error || 'Failed to seed database');
        }
      } else {
        const dist = result.distribution || {};
        const details = Object.entries(dist)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join(', ');

        seedMessage = `✓ Pomyślnie utworzono ${result.created} projektów LGD! (${details})`;

        if (result.cleared > 0) {
          seedMessage += ` Wyczyszczono ${result.cleared} poprzednich obiektów.`;
        }

        // Reload page after 3 seconds to show new data
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (error) {
      console.error('Seed error:', error);
      seedMessage = `Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`;
    } finally {
      seeding = false;
      clearBeforeSeed = false;
    }
  }

  // Return reactive state and methods
  return {
    // Cleanup
    get cleaningUp() { return cleaningUp; },
    get cleanupMessage() { return cleanupMessage; },
    cleanupUnusedTiles,

    // Reset
    get resetting() { return resetting; },
    get resetMessage() { return resetMessage; },
    get showResetConfirm() { return showResetConfirm; },
    initiateReset,
    cancelReset,
    confirmReset,

    // Seeding
    get seeding() { return seeding; },
    get seedMessage() { return seedMessage; },
    get showSeedConfirm() { return showSeedConfirm; },
    get clearBeforeSeed() { return clearBeforeSeed; },
    set clearBeforeSeed(value: boolean) { clearBeforeSeed = value; },
    get objectCount() { return objectCount; },
    fetchObjectCount,
    initiateSeed,
    cancelSeed,
    confirmSeed
  };
}

export type DatabaseManager = ReturnType<typeof createDatabaseManager>;
