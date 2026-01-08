import { useMemo } from 'react';
import type {
  FieldArrayMethods,
  UniversalFormReturn,
} from '@universal-form/core';
import { useFormContext } from './context';

/**
 * Return type for useFieldArray hook
 */
export interface UseFieldArrayReturn<TItem> extends FieldArrayMethods<TItem> {
  /** Number of items in the array */
  length: number;
  /** Whether the array is empty */
  isEmpty: boolean;
}

/**
 * Options for useFieldArray hook
 */
export interface UseFieldArrayOptions<TData extends Record<string, unknown>> {
  /** Form instance (optional if using FormProvider) */
  form?: UniversalFormReturn<TData>;
}

/**
 * Hook for managing array fields (dynamic lists)
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   items: z.array(z.object({
 *     name: z.string(),
 *     quantity: z.number(),
 *   })),
 * });
 *
 * function ItemsList() {
 *   const { fields, append, remove } = useFieldArray<ItemsForm, Item>('items');
 *
 *   return (
 *     <div>
 *       {fields.map((field, index) => (
 *         <div key={field.id}>
 *           <Field name={`items.${index}.name`} />
 *           <Field name={`items.${index}.quantity`} type="number" />
 *           <button onClick={() => remove(index)}>Remove</button>
 *         </div>
 *       ))}
 *       <button onClick={() => append({ name: '', quantity: 1 })}>
 *         Add Item
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFieldArray<
  TData extends Record<string, unknown>,
  TItem = unknown,
>(
  name: string,
  options?: UseFieldArrayOptions<TData>
): UseFieldArrayReturn<TItem> {
  // Get form from context or options
  const contextForm = useFormContext<TData>();
  const form = (options?.form ?? contextForm) as UniversalFormReturn<TData>;

  // Get field array methods from the adapter
  const fieldArrayMethods = form.getFieldArray<TItem>(name);

  // Get current value to compute length
  const currentValue = form.getValue(name) as unknown[];

  // Build return object
  const result = useMemo(
    () => ({
      ...fieldArrayMethods,
      length: currentValue?.length ?? 0,
      isEmpty: !currentValue || currentValue.length === 0,
    }),
    [fieldArrayMethods, currentValue]
  );

  return result;
}
