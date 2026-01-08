import type { ReactNode } from 'react';
import type { UniversalFormReturn } from '@samithahansaka/formless-core';
import { useFieldArray, type UseFieldArrayReturn } from '../useFieldArray';

/**
 * Render prop function type for field array
 */
export type FieldArrayRenderFunction<TItem> = (
  props: UseFieldArrayReturn<TItem>
) => ReactNode;

/**
 * Props for the FieldArray component
 */
export interface FieldArrayProps<
  TData extends Record<string, unknown>,
  TItem = unknown,
> {
  /** Field array name (path) */
  name: string;
  /** Optional form instance (uses context if not provided) */
  form?: UniversalFormReturn<TData>;
  /** Render function for the field array */
  children: FieldArrayRenderFunction<TItem>;
}

/**
 * FieldArray component for rendering dynamic lists of fields
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   todos: z.array(z.object({
 *     title: z.string(),
 *     completed: z.boolean(),
 *   })),
 * });
 *
 * type Todo = { title: string; completed: boolean };
 *
 * function TodoList() {
 *   const form = useUniversalForm({ schema, adapter });
 *
 *   return (
 *     <Form form={form} onSubmit={console.log}>
 *       <FieldArray<typeof form.values, Todo> name="todos">
 *         {({ fields, append, remove }) => (
 *           <div>
 *             {fields.map((field, index) => (
 *               <div key={field.id}>
 *                 <Field name={`todos.${index}.title`} />
 *                 <Field name={`todos.${index}.completed`} type="checkbox" />
 *                 <button type="button" onClick={() => remove(index)}>
 *                   Remove
 *                 </button>
 *               </div>
 *             ))}
 *             <button
 *               type="button"
 *               onClick={() => append({ title: '', completed: false })}
 *             >
 *               Add Todo
 *             </button>
 *           </div>
 *         )}
 *       </FieldArray>
 *       <button type="submit">Save</button>
 *     </Form>
 *   );
 * }
 * ```
 */
export function FieldArray<
  TData extends Record<string, unknown>,
  TItem = unknown,
>({ name, form, children }: FieldArrayProps<TData, TItem>): JSX.Element {
  const fieldArrayHook = useFieldArray<TData, TItem>(name, { form });

  return <>{children(fieldArrayHook)}</>;
}
