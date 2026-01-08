/**
 * Deep comparison utilities for form state
 */

/**
 * Deep equality check between two values
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => deepEqual(val, b[index]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every(key => deepEqual(aObj[key], bObj[key]));
}

/**
 * Shallow equality check between two values
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every(key => aObj[key] === bObj[key]);
}

/**
 * Get the differences between two objects
 * Returns paths that have changed
 */
export function getDirtyPaths(
  original: Record<string, unknown>,
  current: Record<string, unknown>,
  prefix = ''
): string[] {
  const paths: string[] = [];
  const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const origValue = original[key];
    const currValue = current[key];

    if (!deepEqual(origValue, currValue)) {
      paths.push(path);

      // If both are objects, recurse to get nested changes
      if (
        origValue !== null &&
        currValue !== null &&
        typeof origValue === 'object' &&
        typeof currValue === 'object' &&
        !Array.isArray(origValue) &&
        !Array.isArray(currValue)
      ) {
        paths.push(
          ...getDirtyPaths(
            origValue as Record<string, unknown>,
            currValue as Record<string, unknown>,
            path
          )
        );
      }
    }
  }

  return paths;
}

/**
 * Create a dirty fields map from comparing original and current values
 */
export function getDirtyFields<T extends Record<string, unknown>>(
  original: T,
  current: T
): Record<string, boolean> {
  const dirtyPaths = getDirtyPaths(original, current);
  const result: Record<string, boolean> = {};

  for (const path of dirtyPaths) {
    result[path] = true;
  }

  return result;
}
