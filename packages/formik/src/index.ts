/**
 * @samithahansaka/formless-formik
 *
 * Formik adapter for Universal Form Adapter.
 *
 * Provides two ways to integrate Formik:
 *
 * 1. **Imperative adapter** (`formikAdapter`) - Uses a custom state store,
 *    compatible with useUniversalForm for form-agnostic components.
 *
 * 2. **Hook adapter** (`useFormikAdapter`) - Uses Formik's useFormik hook,
 *    providing the best React integration while maintaining UFA compatibility.
 *
 * @example Imperative usage
 * ```tsx
 * import { useUniversalForm } from '@samithahansaka/formless-react';
 * import { formikAdapter } from '@samithahansaka/formless-formik';
 *
 * const form = useUniversalForm({
 *   adapter: formikAdapter(),
 *   defaultValues: { name: '' },
 * });
 * ```
 *
 * @example Hook-based usage
 * ```tsx
 * import { useUniversalForm } from '@samithahansaka/formless-react';
 * import { useFormikAdapter } from '@samithahansaka/formless-formik';
 *
 * const { adapter, formik } = useFormikAdapter({
 *   defaultValues: { name: '' },
 *   mode: 'onBlur',
 * });
 *
 * const form = useUniversalForm({ adapter });
 * ```
 */

// Imperative adapter (uses custom state store)
export { formikAdapter, convertFormikErrors } from './formikAdapter';
export type { FormikEngine, FormikAdapterOptions } from './formikAdapter';

// Hook-based adapter (uses useFormik from formik)
export { useFormikAdapter } from './useFormikAdapter';
export type {
  UseFormikAdapterConfig,
  UseFormikAdapterReturn,
} from './useFormikAdapter';

// Re-export useful types from core
export type {
  EngineAdapter,
  AdapterConfig,
  FormState,
  FieldState,
  FieldError,
  FieldArrayMethods,
} from '@samithahansaka/formless-core';
