/**
 * @universal-form/tanstack-form
 *
 * TanStack Form adapter for Universal Form Adapter.
 *
 * Provides two ways to integrate TanStack Form:
 *
 * 1. **Imperative adapter** (`tanstackAdapter`) - Uses FormApi directly,
 *    compatible with useUniversalForm for form-agnostic components.
 *
 * 2. **Hook adapter** (`useTanStackAdapter`) - Uses TanStack's useForm hook,
 *    providing the best React integration while maintaining UFA compatibility.
 *
 * @example Imperative usage
 * ```tsx
 * import { useUniversalForm } from '@universal-form/react';
 * import { tanstackAdapter } from '@universal-form/tanstack-form';
 *
 * const form = useUniversalForm({
 *   adapter: tanstackAdapter(),
 *   defaultValues: { name: '' },
 * });
 * ```
 *
 * @example Hook-based usage
 * ```tsx
 * import { useUniversalForm } from '@universal-form/react';
 * import { useTanStackAdapter } from '@universal-form/tanstack-form';
 *
 * const { adapter, form: tanstackForm } = useTanStackAdapter({
 *   defaultValues: { name: '' },
 *   mode: 'onBlur',
 * });
 *
 * const form = useUniversalForm({ adapter });
 * ```
 */

// Imperative adapter (uses FormApi from @tanstack/form-core)
export { tanstackAdapter } from './tanstackAdapter';
export type { TanStackEngine, TanStackAdapterOptions } from './tanstackAdapter';

// Hook-based adapter (uses useForm from @tanstack/react-form)
export { useTanStackAdapter } from './useTanStackAdapter';
export type {
  UseTanStackAdapterConfig,
  UseTanStackAdapterReturn,
} from './useTanStackAdapter';
