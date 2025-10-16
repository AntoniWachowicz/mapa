import { connectToDatabase } from './database.js';

/**
 * Clear all pins from the database
 * @returns Number of pins deleted
 */
export async function clearAllPins(): Promise<number> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('objects');
    const result = await collection.deleteMany({});
    console.log(`[resetdb] Deleted ${result.deletedCount} pins`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error clearing pins:', error);
    throw error;
  }
}

/**
 * Reset the schema to default (version 2)
 * This will remove the current schema but preserve map configuration
 */
export async function resetSchema(): Promise<void> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('settings');
    // Only unset the template field, preserving mapConfig and other settings
    await collection.updateOne(
      { type: 'template' },
      { $unset: { template: '' } }
    );
    console.log('[resetdb] Schema reset to default (map config preserved)');
  } catch (error) {
    console.error('Error resetting schema:', error);
    throw error;
  }
}

/**
 * Full database reset - clears all pins and resets schema
 * @returns Object with number of pins deleted
 */
export async function fullReset(): Promise<{ pins: number }> {
  try {
    console.log('[resetdb] Starting full database reset...');
    const pins = await clearAllPins();
    await resetSchema();
    console.log('[resetdb] Full reset complete');
    return { pins };
  } catch (error) {
    console.error('Error during full reset:', error);
    throw error;
  }
}
