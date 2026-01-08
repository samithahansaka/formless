import { createContext, useContext, type ReactNode } from 'react';
import type { UniversalFormReturn } from '@samithahansaka/formless-core';

/**
 * Context for sharing form instance across components
 */
const FormContext = createContext<UniversalFormReturn<
  Record<string, unknown>
> | null>(null);

FormContext.displayName = 'UniversalFormContext';

/**
 * Props for FormProvider component
 */
export interface FormProviderProps<T extends Record<string, unknown>> {
  /** The form instance from useUniversalForm */
  form: UniversalFormReturn<T>;
  /** Child components */
  children: ReactNode;
}

/**
 * Provider component that shares form instance with child components
 *
 * @example
 * ```tsx
 * const form = useUniversalForm({ schema, adapter });
 *
 * return (
 *   <FormProvider form={form}>
 *     <Field name="email" />
 *   </FormProvider>
 * );
 * ```
 */
export function FormProvider<T extends Record<string, unknown>>({
  form,
  children,
}: FormProviderProps<T>): JSX.Element {
  return (
    <FormContext.Provider
      value={form as UniversalFormReturn<Record<string, unknown>>}
    >
      {children}
    </FormContext.Provider>
  );
}

/**
 * Hook to access the form instance from context
 *
 * @throws Error if used outside of FormProvider
 *
 * @example
 * ```tsx
 * function MyField() {
 *   const form = useFormContext();
 *   const value = form.getValue('email');
 *   return <input value={value} />;
 * }
 * ```
 */
export function useFormContext<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): UniversalFormReturn<T> {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error(
      'useFormContext must be used within a FormProvider. ' +
        'Wrap your form components with <FormProvider form={...}> or ' +
        'use the <Form> component which includes the provider.'
    );
  }

  return context as UniversalFormReturn<T>;
}

/**
 * Hook to optionally access the form instance from context
 * Returns null if not within a FormProvider
 */
export function useOptionalFormContext<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): UniversalFormReturn<T> | null {
  return useContext(FormContext) as UniversalFormReturn<T> | null;
}

export { FormContext };
