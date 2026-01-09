# @samithahansaka/formless-formik

[![npm](https://img.shields.io/npm/v/@samithahansaka/formless-formik?style=flat-square)](https://www.npmjs.com/package/@samithahansaka/formless-formik)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-formik?style=flat-square)](https://bundlephobia.com/package/@samithahansaka/formless-formik)
[![license](https://img.shields.io/npm/l/@samithahansaka/formless-formik?style=flat-square)](https://github.com/samithahansaka/formless/blob/master/LICENSE)

**Formik adapter for Formless** - the universal form adapter for React.

| Bundle Size | Minified | Gzipped |
| ----------- | -------- | ------- |
| ESM         | 28.51 KB | ~7 KB   |

This package provides integration with [Formik](https://formik.org/), a popular form library for React.

## Installation

```bash
npm install @samithahansaka/formless-formik formik
```

> **Note:** For most users, we recommend installing `@samithahansaka/formless` which includes this package and all adapters.

## Usage

### Option 1: Imperative Adapter (Recommended)

Use `formikAdapter()` for form-agnostic components:

```tsx
import { useUniversalForm } from '@samithahansaka/formless-react';
import { formikAdapter } from '@samithahansaka/formless-formik';
import { zodBridge } from '@samithahansaka/formless-zod';

const form = useUniversalForm({
  adapter: formikAdapter(),
  schema: zodBridge(mySchema),
  defaultValues: { name: '', email: '' },
});
```

### Option 2: Hook-based Adapter

Use `useFormikAdapter()` when you need access to the native Formik instance:

```tsx
import { useUniversalForm } from '@samithahansaka/formless-react';
import { useFormikAdapter } from '@samithahansaka/formless-formik';
import { zodBridge } from '@samithahansaka/formless-zod';

function MyForm() {
  const { adapter, formik } = useFormikAdapter({
    defaultValues: { name: '', email: '' },
    schema: zodBridge(mySchema),
    mode: 'onBlur',
  });

  const form = useUniversalForm({ adapter });

  // Access native Formik features via formik
  console.log(formik.touched);

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* ... */}</form>;
}
```

## Adapter Options

```typescript
formikAdapter({
  // Validate on mount
  validateOnMount: false,
});
```

## Migration from Formik

```typescript
// Before (Formik)
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';

const formik = useFormik({
  initialValues: { name: '' },
  validationSchema: toFormikValidationSchema(schema),
  onSubmit: handleSubmit,
});

// After (Formless)
import { useUniversalForm, Field } from '@samithahansaka/formless-react';
import { formikAdapter } from '@samithahansaka/formless-formik';
import { zodBridge } from '@samithahansaka/formless-zod';

const form = useUniversalForm({
  adapter: formikAdapter(),
  schema: zodBridge(schema),
  defaultValues: { name: '' },
});
```

## Why Use This?

- **Swap engines easily** - Switch to React Hook Form or TanStack Form without rewriting components
- **Consistent API** - Same interface regardless of underlying form library
- **Full Formik power** - Access native Formik features when needed via hook adapter

## Documentation

For full documentation, visit the [main repository](https://github.com/samithahansaka/formless).

## License

MIT
