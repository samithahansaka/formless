import type { ReactNode } from 'react';
import type { UniversalFormReturn } from '@samithahansaka/formless-core';
import { useField, type UseFieldReturn } from '../useField';

/**
 * Render prop function type for custom field rendering
 */
export type FieldRenderFunction<TValue = unknown> = (
  props: UseFieldReturn<TValue>
) => ReactNode;

/**
 * Props for the Field component
 */
export interface FieldProps<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TValue = unknown,
> {
  /** Field name (path) */
  name: string;
  /** Optional form instance (uses context if not provided) */
  form?: UniversalFormReturn<TData>;
  /** Optional label for the field */
  label?: string;
  /** Optional helper text */
  helperText?: string;
  /** Custom render function for full control */
  render?: FieldRenderFunction<TValue>;
  /** Component to use for rendering (default: 'input') */
  as?: 'input' | 'textarea' | 'select';
  /** Input type (text, email, password, etc.) */
  type?: string;
  /** Placeholder text */
  placeholder?: string;
  /** CSS class name */
  className?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Rows for textarea */
  rows?: number;
  /** Additional props to spread on the input */
  inputProps?: Record<string, unknown>;
}

/**
 * Field component for rendering form inputs
 *
 * Can be used as a simple input or with custom rendering via render prop.
 *
 * @example
 * ```tsx
 * // Simple input
 * <Field name="email" type="email" placeholder="Enter email" />
 *
 * // With label
 * <Field name="email" label="Email Address" />
 *
 * // Custom rendering
 * <Field
 *   name="email"
 *   render={({ field, error, isTouched }) => (
 *     <div className="field-group">
 *       <input {...field} className={error ? 'error' : ''} />
 *       {isTouched && error && <span className="error-text">{error}</span>}
 *     </div>
 *   )}
 * />
 *
 * // Textarea
 * <Field name="bio" as="textarea" rows={4} />
 * ```
 */
export function Field<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TValue = unknown,
>({
  name,
  form,
  label,
  helperText,
  render,
  as = 'input',
  type = 'text',
  placeholder,
  className,
  disabled,
  readOnly,
  rows,
  inputProps,
}: FieldProps<TData, TValue>): JSX.Element {
  const fieldHook = useField<TData, TValue>(name, { form });
  const { field, error, isTouched, isInvalid } = fieldHook;

  // If render prop is provided, use it
  if (render) {
    return <>{render(fieldHook)}</>;
  }

  // Build class names
  const fieldClassName = [
    className,
    isInvalid && isTouched ? 'ufa-field-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Common input props
  const commonProps = {
    id: field.name,
    name: field.name,
    className: fieldClassName || undefined,
    'aria-invalid': isInvalid && isTouched ? ('true' as const) : undefined,
    'aria-describedby': error && isTouched ? `${field.name}-error` : undefined,
    placeholder,
    disabled,
    readOnly,
    onBlur: field.onBlur,
    ...inputProps,
  };

  // Render the appropriate element
  let inputElement: JSX.Element;

  if (as === 'textarea') {
    inputElement = (
      <textarea
        {...commonProps}
        rows={rows}
        value={(field.value as string) ?? ''}
        onChange={e => field.onChange(e.target.value as TValue)}
        ref={field.ref as React.Ref<HTMLTextAreaElement>}
      />
    );
  } else if (as === 'select') {
    inputElement = (
      <select
        {...commonProps}
        value={(field.value as string) ?? ''}
        onChange={e => field.onChange(e.target.value as TValue)}
        ref={field.ref as React.Ref<HTMLSelectElement>}
      />
    );
  } else {
    inputElement = (
      <input
        {...commonProps}
        type={type}
        value={(field.value as string | number) ?? ''}
        onChange={e => {
          if (type === 'checkbox') {
            field.onChange(e.target.checked as TValue);
          } else if (type === 'number') {
            field.onChange(
              (e.target.value === '' ? '' : Number(e.target.value)) as TValue
            );
          } else {
            field.onChange(e.target.value as TValue);
          }
        }}
        checked={type === 'checkbox' ? (field.value as boolean) : undefined}
        ref={field.ref}
      />
    );
  }

  return (
    <div className="ufa-field">
      {label && (
        <label htmlFor={field.name} className="ufa-field-label">
          {label}
        </label>
      )}

      {inputElement}

      {helperText && !error && (
        <span className="ufa-field-helper">{helperText}</span>
      )}

      {error && isTouched && (
        <span
          id={`${field.name}-error`}
          className="ufa-field-error-text"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
