/**
 * Input Validation Utilities
 * Prevents injection attacks by validating user input.
 */

// Valid field key pattern: alphanumeric + underscore, starts with letter
const FIELD_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * Validate field key to prevent MongoDB injection
 * Field keys are used in $set operations and must be safe
 */
export function isValidFieldKey(key: unknown): key is string {
  if (typeof key !== 'string') return false;
  if (key.length === 0 || key.length > 64) return false;
  if (!FIELD_KEY_PATTERN.test(key)) return false;
  // Block MongoDB operators
  if (key.startsWith('$')) return false;
  return true;
}

/**
 * Validate MongoDB ObjectId format (24 hex characters)
 */
export function isValidObjectId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Validate array of ObjectIds
 */
export function validateObjectIds(ids: unknown): ids is string[] {
  if (!Array.isArray(ids)) return false;
  return ids.every(isValidObjectId);
}
