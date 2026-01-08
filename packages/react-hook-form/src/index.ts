/**
 * @universal-form/react-hook-form
 *
 * React Hook Form adapter for Universal Form Adapter.
 *
 * Provides two ways to integrate React Hook Form:
 *
 * 1. **Imperative adapter** (`rhfAdapter`) - Uses a custom state store,
 *    compatible with useUniversalForm for form-agnostic components.
 *
 * 2. **Hook adapter** (`useRHFAdapter`) - Uses RHF's useForm hook,
 *    providing the best React integration while maintaining UFA compatibility.
 *
 * @example Imperative usage
 * ```tsx
 * import { useUniversalForm } from '@universal-form/react';
 * import { rhfAdapter } from '@universal-form/react-hook-form';
 *
 * const form = useUniversalForm({
 *   adapter: rhfAdapter(),
 *   defaultValues: { name: '' },
 * });
 * ```
 *
 * @example Hook-based usage
 * ```tsx
 * import { useUniversalForm } from '@universal-form/react';
 * import { useRHFAdapter } from '@universal-form/react-hook-form';
 *
 * const { adapter, form: rhfForm } = useRHFAdapter({
 *   defaultValues: { name: '' },
 *   mode: 'onBlur',
 * });
 *
 * const form = useUniversalForm({ adapter });
 * ```
 */

// Imperative adapter (uses custom state store)
export { rhfAdapter, convertRHFErrors } from './rhfAdapter';
export type { RHFEngine, RHFAdapterOptions } from './rhfAdapter';

// Hook-based adapter (uses useForm from react-hook-form)
export { useRHFAdapter } from './useRHFAdapter';
export type { UseRHFAdapterConfig, UseRHFAdapterReturn } from './useRHFAdapter';

// Re-export useful types from core
export type {
  EngineAdapter,
  AdapterConfig,
  FormState,
  FieldState,
  FieldError,
  FieldArrayMethods,
} from '@universal-form/core';
