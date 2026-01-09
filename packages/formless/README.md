# @samithahansaka/formless

[![npm](https://img.shields.io/npm/v/@samithahansaka/formless?style=flat-square)](https://www.npmjs.com/package/@samithahansaka/formless)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless?style=flat-square)](https://bundlephobia.com/package/@samithahansaka/formless)
[![license](https://img.shields.io/npm/l/@samithahansaka/formless?style=flat-square)](https://github.com/samithahansaka/formless/blob/master/LICENSE)

**All-in-one package for Formless** - Universal form adapter for React.

| Bundle Size | Minified | Gzipped |
| ----------- | -------- | ------- |
| ESM         | 1.05 KB  | ~0.5 KB |

This is the recommended way to install Formless. It includes all adapters and utilities in a single package.

## Installation

```bash
npm install @samithahansaka/formless

# Plus your form library of choice
npm install react-hook-form  # or formik, or @tanstack/react-form
npm install zod              # for schema validation
```

## Quick Start

```tsx
import { z } from 'zod';
import {
  useUniversalForm,
  Field,
  rhfAdapter, // or formikAdapter, tanstackAdapter
  zodBridge,
} from '@samithahansaka/formless';

const schema = zodBridge(
  z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
  })
);

function ContactForm() {
  const form = useUniversalForm({
    schema,
    adapter: rhfAdapter(),
    defaultValues: { name: '', email: '' },
  });

  return (
    <form onSubmit={form.handleSubmit(data => console.log(data))}>
      <Field form={form} name="name" placeholder="Name" />
      <Field form={form} name="email" type="email" placeholder="Email" />
      <button type="submit" disabled={form.isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

## What's Included

This package re-exports everything from:

- `@samithahansaka/formless-core` - Core types and utilities
- `@samithahansaka/formless-react` - React hooks and components
- `@samithahansaka/formless-react-hook-form` - React Hook Form adapter
- `@samithahansaka/formless-formik` - Formik adapter
- `@samithahansaka/formless-tanstack-form` - TanStack Form adapter
- `@samithahansaka/formless-zod` - Zod schema bridge

## Available Exports

### Hooks

- `useUniversalForm` - Main form hook
- `useField` - Individual field hook
- `useFieldArray` - Dynamic field arrays
- `useWatch` - Watch form values

### Components

- `Form` - Form wrapper component
- `Field` - Field component
- `FieldArray` - Field array component
- `FormProvider` - Context provider

### Adapters

- `rhfAdapter` - React Hook Form adapter
- `formikAdapter` - Formik adapter
- `tanstackAdapter` - TanStack Form adapter
- `useRHFAdapter` - React Hook Form hook adapter
- `useFormikAdapter` - Formik hook adapter
- `useTanStackAdapter` - TanStack Form hook adapter

### Schema Bridges

- `zodBridge` - Zod schema bridge

### Utilities

- Path utilities: `getByPath`, `setByPath`, `parsePath`, etc.
- Error utilities: `normalizeFieldError`, `mergeErrors`, etc.
- Comparison utilities: `deepEqual`, `shallowEqual`, etc.

## Documentation

For full documentation, visit the [main repository](https://github.com/samithahansaka/formless).

## License

MIT
