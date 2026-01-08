import type { FormHTMLAttributes, ReactNode } from 'react';
import type { UniversalFormReturn, FormErrors } from '@universal-form/core';
import { FormProvider } from '../context';

/**
 * Props for the Form component
 */
export interface FormProps<T extends Record<string, unknown>> extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'onSubmit' | 'onError'
> {
  /** Form instance from useUniversalForm */
  form: UniversalFormReturn<T>;
  /** Callback when form is submitted with valid data */
  onSubmit?: (data: T) => void | Promise<void>;
  /** Callback when form submission fails validation */
  onError?: (errors: FormErrors<T>) => void;
  /** Child components */
  children: ReactNode;
}

/**
 * Form component that wraps a native form element with Universal Form functionality
 *
 * Provides FormProvider context automatically so child Field components can access
 * the form instance.
 *
 * @example
 * ```tsx
 * const form = useUniversalForm({ schema, adapter });
 *
 * return (
 *   <Form form={form} onSubmit={data => console.log(data)}>
 *     <Field name="email" />
 *     <Field name="password" type="password" />
 *     <button type="submit">Submit</button>
 *   </Form>
 * );
 * ```
 */
export function Form<T extends Record<string, unknown>>({
  form,
  onSubmit,
  onError,
  children,
  ...htmlProps
}: FormProps<T>): JSX.Element {
  const handleFormSubmit = form.handleSubmit(
    data => onSubmit?.(data),
    errors => onError?.(errors)
  );

  return (
    <FormProvider form={form}>
      <form {...htmlProps} onSubmit={handleFormSubmit}>
        {children}
      </form>
    </FormProvider>
  );
}
