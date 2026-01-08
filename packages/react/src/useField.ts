import { useCallback, useMemo } from 'react';
import type {
  FieldState,
  FieldError,
  UniversalFormReturn,
} from '@samithahansaka/formless-core';
import { useFormContext } from './context';

/**
 * Return type for useField hook
 */
export interface UseFieldReturn<TValue = unknown> {
  /** Props to spread on the input element */
  field: {
    name: string;
    value: TValue;
    onChange: (value: TValue | React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    ref: (instance: HTMLInputElement | null) => void;
  };
  /** Current field state */
  fieldState: FieldState;
  /** Field error message, if any */
  error: string | undefined;
  /** Whether field has been touched */
  isTouched: boolean;
  /** Whether field is invalid */
  isInvalid: boolean;
  /** Whether field is dirty */
  isDirty: boolean;
  /** Set the field value */
  setValue: (value: TValue, options?: { shouldValidate?: boolean }) => void;
  /** Set a field error */
  setError: (error: string | FieldError) => void;
  /** Clear the field error */
  clearError: () => void;
}

/**
 * Options for useField hook
 */
export interface UseFieldOptions<TData extends Record<string, unknown>> {
  /** Form instance (optional if using FormProvider) */
  form?: UniversalFormReturn<TData>;
}

/**
 * Hook for connecting a field to the form
 *
 * Can be used with FormProvider context or with an explicit form instance.
 *
 * @example
 * ```tsx
 * // With FormProvider (recommended)
 * function EmailField() {
 *   const { field, error } = useField<MyFormData, string>('email');
 *   return (
 *     <div>
 *       <input {...field} />
 *       {error && <span>{error}</span>}
 *     </div>
 *   );
 * }
 *
 * // With explicit form instance
 * function EmailField({ form }) {
 *   const { field, error } = useField('email', { form });
 *   return <input {...field} />;
 * }
 * ```
 */
export function useField<
  TData extends Record<string, unknown>,
  TValue = unknown,
>(name: string, options?: UseFieldOptions<TData>): UseFieldReturn<TValue> {
  // Get form from context or options
  const contextForm = useFormContext<TData>();
  const form = (options?.form ?? contextForm) as UniversalFormReturn<TData>;

  // Get current field state
  const fieldState = form.getFieldState(name);
  const value = form.getValue(name) as TValue;

  // Create onChange handler that handles both events and direct values
  const onChange = useCallback(
    (valueOrEvent: TValue | React.ChangeEvent<HTMLInputElement>) => {
      let newValue: TValue;

      if (
        valueOrEvent &&
        typeof valueOrEvent === 'object' &&
        'target' in valueOrEvent
      ) {
        // It's an event
        const target = valueOrEvent.target;
        if (target.type === 'checkbox') {
          newValue = target.checked as TValue;
        } else if (target.type === 'number') {
          newValue = (
            target.value === '' ? '' : Number(target.value)
          ) as TValue;
        } else {
          newValue = target.value as TValue;
        }
      } else {
        // It's a direct value
        newValue = valueOrEvent as TValue;
      }

      form.setValue(name, newValue, { shouldValidate: true });
    },
    [form, name]
  );

  // Register field to get ref and other props
  const registered = form.register(name);

  // Create onBlur handler
  const onBlur = useCallback(() => {
    registered.onBlur({});
  }, [registered]);

  // Create field props
  const field = useMemo(
    () => ({
      name,
      value,
      onChange,
      onBlur,
      ref: registered.ref as (instance: HTMLInputElement | null) => void,
    }),
    [name, value, onChange, onBlur, registered.ref]
  );

  // Helper functions
  const setValue = useCallback(
    (newValue: TValue, options?: { shouldValidate?: boolean }) => {
      form.setValue(name, newValue, options);
    },
    [form, name]
  );

  const setError = useCallback(
    (error: string | FieldError) => {
      form.setError(name, error);
    },
    [form, name]
  );

  const clearError = useCallback(() => {
    form.clearErrors(name);
  }, [form, name]);

  return {
    field,
    fieldState,
    error: fieldState.error?.message,
    isTouched: fieldState.isTouched,
    isInvalid: fieldState.isInvalid,
    isDirty: fieldState.isDirty,
    setValue,
    setError,
    clearError,
  };
}
