# @samithahansaka/formless-react-hook-form

[![npm](https://img.shields.io/npm/v/@samithahansaka/formless-react-hook-form?style=flat-square)](https://www.npmjs.com/package/@samithahansaka/formless-react-hook-form)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-react-hook-form?style=flat-square)](https://bundlephobia.com/package/@samithahansaka/formless-react-hook-form)
[![license](https://img.shields.io/npm/l/@samithahansaka/formless-react-hook-form?style=flat-square)](https://github.com/samithahansaka/formless/blob/master/LICENSE)

**React Hook Form adapter for Formless** - the universal form adapter for React.

| Bundle Size | Minified | Gzipped |
| ----------- | -------- | ------- |
| ESM         | 27.46 KB | ~7 KB   |

This package provides integration with [React Hook Form](https://react-hook-form.com/), one of the most popular form libraries for React.

## Installation

```bash
npm install @samithahansaka/formless-react-hook-form react-hook-form
```

> **Note:** For most users, we recommend installing `@samithahansaka/formless` which includes this package and all adapters.

## Usage

### Option 1: Imperative Adapter (Recommended)

Use `rhfAdapter()` for form-agnostic components:

```tsx
import { useUniversalForm } from '@samithahansaka/formless-react';
import { rhfAdapter } from '@samithahansaka/formless-react-hook-form';
import { zodBridge } from '@samithahansaka/formless-zod';

const form = useUniversalForm({
  adapter: rhfAdapter(),
  schema: zodBridge(mySchema),
  defaultValues: { name: '', email: '' },
});
```

### Option 2: Hook-based Adapter

Use `useRHFAdapter()` when you need access to the native RHF form instance:

```tsx
import { useUniversalForm } from '@samithahansaka/formless-react';
import { useRHFAdapter } from '@samithahansaka/formless-react-hook-form';
import { zodBridge } from '@samithahansaka/formless-zod';

function MyForm() {
  const { adapter, form: rhfForm } = useRHFAdapter({
    defaultValues: { name: '', email: '' },
    schema: zodBridge(mySchema),
    mode: 'onBlur',
  });

  const form = useUniversalForm({ adapter });

  // Access native RHF features via rhfForm
  console.log(rhfForm.formState.dirtyFields);

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* ... */}</form>;
}
```

## Adapter Options

```typescript
rhfAdapter({
  // Debounce async validation (ms)
  asyncDebounceMs: 300,
});
```

## Migration from React Hook Form

```typescript
// Before (React Hook Form)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '' },
});

// After (Formless)
import { useUniversalForm, Field } from '@samithahansaka/formless-react';
import { rhfAdapter } from '@samithahansaka/formless-react-hook-form';
import { zodBridge } from '@samithahansaka/formless-zod';

const form = useUniversalForm({
  adapter: rhfAdapter(),
  schema: zodBridge(schema),
  defaultValues: { name: '' },
});
```

## Why Use This?

- **Swap engines easily** - Switch to Formik or TanStack Form without rewriting components
- **Consistent API** - Same interface regardless of underlying form library
- **Full RHF power** - Access native RHF features when needed via hook adapter

## Documentation

For full documentation, visit the [main repository](https://github.com/samithahansaka/formless).

## License

MIT
