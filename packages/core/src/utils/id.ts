/**
 * Simple ID generation utilities
 */

let counter = 0;

/**
 * Generate a unique ID for field array items
 * Uses a simple incrementing counter for performance
 */
export function generateId(): string {
  return `ufa_${++counter}`;
}

/**
 * Reset the ID counter (useful for testing)
 */
export function resetIdCounter(): void {
  counter = 0;
}

/**
 * Generate a deterministic ID from a path and index
 * Useful when you need consistent IDs across renders
 */
export function generateFieldId(path: string, index?: number): string {
  const base = path.replace(/\./g, '_');
  return index !== undefined ? `${base}_${index}` : base;
}
