# @samithahansaka/formless-tanstack-form

[![npm](https://img.shields.io/npm/v/@samithahansaka/formless-tanstack-form?style=flat-square)](https://www.npmjs.com/package/@samithahansaka/formless-tanstack-form)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-tanstack-form?style=flat-square)](https://bundlephobia.com/package/@samithahansaka/formless-tanstack-form)
[![license](https://img.shields.io/npm/l/@samithahansaka/formless-tanstack-form?style=flat-square)](https://github.com/samithahansaka/formless/blob/master/LICENSE)

**TanStack Form adapter for Formless** - the universal form adapter for React.

| Bundle Size | Minified  | Gzipped |
| ----------- | --------- | ------- |
| ESM         | 103.12 KB | ~25 KB  |

This package provides integration with [TanStack Form](https://tanstack.com/form), the newest form library from the TanStack ecosystem. Supports TanStack Form v1.x.

## Installation

```bash
npm install @samithahansaka/formless-tanstack-form @tanstack/react-form
```

> **Note:** For most users, we recommend installing `@samithahansaka/formless` which includes this package and all adapters.

## Usage

### Option 1: Imperative Adapter (Recommended)

Use `tanstackAdapter()` for form-agnostic components:

```tsx
import { useUniversalForm } from '@samithahansaka/formless-react';
import { tanstackAdapter } from '@samithahansaka/formless-tanstack-form';
import { zodBridge } from '@samithahansaka/formless-zod';

const form = useUniversalForm({
  adapter: tanstackAdapter(),
  schema: zodBridge(mySchema),
  defaultValues: { name: '', email: '' },
});
```

### Option 2: Hook-based Adapter

Use `useTanStackAdapter()` when you need access to the native TanStack Form instance:

```tsx
import { useUniversalForm } from '@samithahansaka/formless-react';
import { useTanStackAdapter } from '@samithahansaka/formless-tanstack-form';
import { zodBridge } from '@samithahansaka/formless-zod';

function MyForm() {
  const { adapter, form: tanstackForm } = useTanStackAdapter({
    defaultValues: { name: '', email: '' },
    schema: zodBridge(mySchema),
    mode: 'onBlur',
  });

  const form = useUniversalForm({ adapter });

  // Access native TanStack Form features via tanstackForm
  console.log(tanstackForm.getValues());

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* ... */}</form>;
}
```

## Adapter Options

```typescript
tanstackAdapter({
  // Debounce async validation (ms)
  asyncDebounceMs: 300,
});
```

## TanStack Form v1 Compatibility

This adapter is fully compatible with TanStack Form v1.x. It handles the complex generic types and API changes internally, providing a simple and consistent interface.

## Why Use This?

- **Swap engines easily** - Switch to React Hook Form or Formik without rewriting components
- **Consistent API** - Same interface regardless of underlying form library
- **Full TanStack power** - Access native TanStack Form features when needed via hook adapter
- **Modern architecture** - TanStack Form offers excellent TypeScript support and performance

## Documentation

For full documentation, visit the [main repository](https://github.com/samithahansaka/formless).

## License

MIT
