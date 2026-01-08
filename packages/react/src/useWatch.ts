import { useSyncExternalStore, useCallback, useRef } from 'react';
import type { UniversalFormReturn } from '@samithahansaka/formless-core';
import { getByPath, deepEqual } from '@samithahansaka/formless-core';
import { useFormContext } from './context';

/**
 * Options for useWatch hook
 */
export interface UseWatchOptions<TData extends Record<string, unknown>> {
  /** Form instance (optional if using FormProvider) */
  form?: UniversalFormReturn<TData>;
  /** Default value to return before form is mounted */
  defaultValue?: unknown;
}

/**
 * Hook for watching form values with optimized re-renders
 *
 * Only triggers re-renders when the watched value actually changes.
 *
 * @example
 * ```tsx
 * // Watch a single field
 * function EmailPreview() {
 *   const email = useWatch<MyFormData>('email') as string;
 *   return <div>Email: {email}</div>;
 * }
 *
 * // Watch multiple fields
 * function AddressPreview() {
 *   const address = useWatch<MyFormData>(['street', 'city', 'zip']);
 *   return (
 *     <div>
 *       {address.street}, {address.city} {address.zip}
 *     </div>
 *   );
 * }
 *
 * // Watch entire form
 * function FormDebug() {
 *   const values = useWatch<MyFormData>();
 *   return <pre>{JSON.stringify(values, null, 2)}</pre>;
 * }
 * ```
 */
export function useWatch<TData extends Record<string, unknown>>(
  options?: UseWatchOptions<TData>
): TData;

export function useWatch<TData extends Record<string, unknown>>(
  name: string,
  options?: UseWatchOptions<TData>
): unknown;

export function useWatch<TData extends Record<string, unknown>>(
  names: string[],
  options?: UseWatchOptions<TData>
): Record<string, unknown>;

export function useWatch<TData extends Record<string, unknown>>(
  nameOrOptions?: string | string[] | UseWatchOptions<TData>,
  maybeOptions?: UseWatchOptions<TData>
): TData | unknown | Record<string, unknown> {
  // Parse arguments
  let name: string | string[] | undefined;
  let options: UseWatchOptions<TData> | undefined;

  if (
    nameOrOptions === undefined ||
    (typeof nameOrOptions === 'object' &&
      !Array.isArray(nameOrOptions) &&
      'form' in nameOrOptions)
  ) {
    options = nameOrOptions as UseWatchOptions<TData>;
  } else {
    name = nameOrOptions as string | string[];
    options = maybeOptions;
  }

  // Get form from context or options
  const contextForm = useFormContext<TData>();
  const form = (options?.form ?? contextForm) as UniversalFormReturn<TData>;

  // Cache for comparing values
  const valueRef = useRef<unknown>(undefined);

  // Subscribe to form state changes
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return form.subscribe(state => {
        // Extract the watched value(s)
        let newValue: unknown;

        if (name === undefined) {
          newValue = state.values;
        } else if (Array.isArray(name)) {
          const result: Record<string, unknown> = {};
          for (const n of name) {
            result[n] = getByPath(state.values, n);
          }
          newValue = result;
        } else {
          newValue = getByPath(state.values, name);
        }

        // Only trigger re-render if value actually changed
        if (!deepEqual(valueRef.current, newValue)) {
          valueRef.current = newValue;
          onStoreChange();
        }
      });
    },
    [form, name]
  );

  // Get current snapshot
  const getSnapshot = useCallback(() => {
    const state = form.getState();

    if (name === undefined) {
      return state.values;
    }

    if (Array.isArray(name)) {
      const result: Record<string, unknown> = {};
      for (const n of name) {
        result[n] = getByPath(state.values, n);
      }
      return result;
    }

    return getByPath(state.values, name);
  }, [form, name]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
