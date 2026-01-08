/**
 * Path utilities for working with nested object paths
 */

/**
 * Get a value from an object using dot notation path
 *
 * @example
 * getByPath({ user: { name: 'John' } }, 'user.name') // 'John'
 * getByPath({ items: [{ id: 1 }] }, 'items.0.id') // 1
 */
export function getByPath<T>(obj: T, path: string): unknown {
  if (!path) return obj;

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set a value in an object using dot notation path (immutable)
 *
 * @example
 * setByPath({ user: { name: 'John' } }, 'user.name', 'Jane')
 * // { user: { name: 'Jane' } }
 */
export function setByPath<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  if (!path) {
    return value as T;
  }

  const keys = path.split('.');
  const result = structuredClone(obj) as Record<string, unknown>;
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const isNextKeyArrayIndex = /^\d+$/.test(nextKey);

    if (current[key] === undefined || current[key] === null) {
      current[key] = isNextKeyArrayIndex ? [] : {};
    } else if (typeof current[key] !== 'object') {
      current[key] = isNextKeyArrayIndex ? [] : {};
    } else {
      // Clone to maintain immutability
      current[key] = Array.isArray(current[key])
        ? [...(current[key] as unknown[])]
        : { ...(current[key] as Record<string, unknown>) };
    }

    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return result as T;
}

/**
 * Delete a value from an object using dot notation path (immutable)
 */
export function deleteByPath<T extends Record<string, unknown>>(
  obj: T,
  path: string
): T {
  if (!path) {
    return {} as T;
  }

  const keys = path.split('.');
  const result = structuredClone(obj) as Record<string, unknown>;
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (current[key] === undefined || typeof current[key] !== 'object') {
      return result as T;
    }

    current[key] = Array.isArray(current[key])
      ? [...(current[key] as unknown[])]
      : { ...(current[key] as Record<string, unknown>) };

    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  delete current[lastKey];

  return result as T;
}

/**
 * Check if a path exists in an object
 */
export function hasPath<T>(obj: T, path: string): boolean {
  if (!path) return true;

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return false;
    }

    if (typeof current === 'object' && key in (current as object)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Get all paths in an object (flattened)
 *
 * @example
 * getAllPaths({ user: { name: 'John' }, items: [1, 2] })
 * // ['user', 'user.name', 'items', 'items.0', 'items.1']
 */
export function getAllPaths(
  obj: unknown,
  prefix = '',
  paths: string[] = []
): string[] {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return paths;
  }

  const entries = Array.isArray(obj)
    ? obj.map((v, i) => [String(i), v] as const)
    : Object.entries(obj);

  for (const [key, value] of entries) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);

    if (value !== null && typeof value === 'object') {
      getAllPaths(value, path, paths);
    }
  }

  return paths;
}

/**
 * Parse a path string into segments
 */
export function parsePath(path: string): string[] {
  return path.split('.').filter(Boolean);
}

/**
 * Join path segments into a path string
 */
export function joinPath(...segments: (string | number)[]): string {
  return segments.filter(s => s !== '' && s !== undefined).join('.');
}

/**
 * Get parent path from a path
 *
 * @example
 * getParentPath('user.profile.name') // 'user.profile'
 * getParentPath('user') // ''
 */
export function getParentPath(path: string): string {
  const segments = parsePath(path);
  return segments.slice(0, -1).join('.');
}

/**
 * Get the last segment of a path
 *
 * @example
 * getLastSegment('user.profile.name') // 'name'
 */
export function getLastSegment(path: string): string {
  const segments = parsePath(path);
  return segments[segments.length - 1] || '';
}

/**
 * Check if path is an array index path
 *
 * @example
 * isArrayPath('items.0') // true
 * isArrayPath('items.0.name') // true
 * isArrayPath('items') // false
 */
export function isArrayPath(path: string): boolean {
  const segments = parsePath(path);
  return segments.some(s => /^\d+$/.test(s));
}

/**
 * Get the array base path and index from a path
 *
 * @example
 * getArrayInfo('items.0.name') // { basePath: 'items', index: 0, remainder: 'name' }
 */
export function getArrayInfo(path: string): {
  basePath: string;
  index: number;
  remainder: string;
} | null {
  const segments = parsePath(path);
  const indexIdx = segments.findIndex(s => /^\d+$/.test(s));

  if (indexIdx === -1) {
    return null;
  }

  return {
    basePath: segments.slice(0, indexIdx).join('.'),
    index: parseInt(segments[indexIdx], 10),
    remainder: segments.slice(indexIdx + 1).join('.'),
  };
}
