<p align="center">
  <a href="https://github.com/samithahansaka/formless/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/samithahansaka/formless/ci.yml?branch=master&style=flat-square&label=CI" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@samithahansaka/formless-core"><img src="https://img.shields.io/npm/v/@samithahansaka/formless-core?style=flat-square&color=blue" alt="npm version" /></a>
  <img src="https://img.shields.io/npm/dm/@samithahansaka/formless-core?style=flat-square&color=green" alt="downloads" />
  <img src="https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-core?style=flat-square&color=orange" alt="bundle size" />
  <a href="https://codecov.io/gh/samithahansaka/formless"><img src="https://img.shields.io/codecov/c/github/samithahansaka/formless?style=flat-square" alt="coverage" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@samithahansaka/formless-core?style=flat-square" alt="license" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<h1 align="center">Formless</h1>

<p align="center">
  <strong>A form-agnostic React library — one API for React Hook Form, Formik, and TanStack Form</strong>
</p>

<p align="center">
  Write your form components once, swap the underlying engine by changing a single import.
</p>

---

## Features

- **Form Agnostic** — Switch between React Hook Form, Formik, and TanStack Form without rewriting components
- **Schema-First Validation** — Built-in Zod support with extensible schema bridge architecture
- **Full TypeScript Support** — Complete type definitions with intelligent autocomplete
- **Tiny Footprint** — Minimal overhead on top of your chosen form library
- **Dual API** — Use hooks (`useUniversalForm`) or components (`<Field />`)
- **Field Arrays** — Built-in support for dynamic lists with stable keys
- **SSR Compatible** — Works with Next.js, Remix, and other SSR frameworks

## Installation

```bash
# Core packages
npm install @samithahansaka/formless-core @samithahansaka/formless-react @samithahansaka/formless-zod

# Choose your form engine adapter
npm install @samithahansaka/formless-react-hook-form react-hook-form
# or
npm install @samithahansaka/formless-formik formik
# or
npm install @samithahansaka/formless-tanstack-form @tanstack/react-form
```

## Quick Start

### 1. Define your schema

```typescript
import { z } from 'zod';
import { zodBridge } from '@samithahansaka/formless-zod';

const schema = zodBridge(
  z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
  })
);
```

### 2. Choose your adapter

```typescript
import { rhfAdapter } from '@samithahansaka/formless-react-hook-form';
// or: import { formikAdapter } from '@samithahansaka/formless-formik';
// or: import { tanstackAdapter } from '@samithahansaka/formless-tanstack-form';

const adapter = rhfAdapter();
```

### 3. Build your form

```tsx
import { useUniversalForm, Field } from '@samithahansaka/formless-react';

function ContactForm() {
  const form = useUniversalForm({
    schema,
    adapter,
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

## Packages

| Package                                                                  | Description                           | Size                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [`@samithahansaka/formless-core`](./packages/core)                       | Core types, utilities, and interfaces | ![](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-core?style=flat-square&label=)            |
| [`@samithahansaka/formless-react`](./packages/react)                     | React hooks and components            | ![](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-react?style=flat-square&label=)           |
| [`@samithahansaka/formless-react-hook-form`](./packages/react-hook-form) | React Hook Form adapter               | ![](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-react-hook-form?style=flat-square&label=) |
| [`@samithahansaka/formless-formik`](./packages/formik)                   | Formik adapter                        | ![](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-formik?style=flat-square&label=)          |
| [`@samithahansaka/formless-tanstack-form`](./packages/tanstack-form)     | TanStack Form adapter                 | ![](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-tanstack-form?style=flat-square&label=)   |
| [`@samithahansaka/formless-zod`](./packages/zod)                         | Zod schema bridge                     | ![](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-zod?style=flat-square&label=)             |

## API Reference

### `useUniversalForm(config)`

Main hook for creating a form instance.

```typescript
const form = useUniversalForm({
  schema: SchemaBridge,           // Required: Zod bridge or custom schema
  adapter: EngineAdapter,         // Required: Form library adapter
  defaultValues?: Partial<T>,     // Optional: Initial form values
  mode?: ValidationMode,          // Optional: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all'
});
```

**Returns:**

| Property                            | Type                                     | Description               |
| ----------------------------------- | ---------------------------------------- | ------------------------- |
| `values`                            | `T`                                      | Current form values       |
| `errors`                            | `FormErrors<T>`                          | Current validation errors |
| `isSubmitting`                      | `boolean`                                | Submission in progress    |
| `isValid`                           | `boolean`                                | Form passes validation    |
| `isDirty`                           | `boolean`                                | Form has been modified    |
| `getValue(path)`                    | `(path: string) => unknown`              | Get value at path         |
| `setValue(path, value)`             | `(path: string, value: unknown) => void` | Set value at path         |
| `getError(path)`                    | `(path: string) => FieldError`           | Get error at path         |
| `setError(path, error)`             | `(path: string, error: string) => void`  | Set error at path         |
| `clearErrors(paths?)`               | `(paths?: string[]) => void`             | Clear errors              |
| `register(path)`                    | `(path: string) => FieldRegisterProps`   | Register field            |
| `handleSubmit(onValid, onInvalid?)` | `Function`                               | Form submit handler       |
| `reset(values?)`                    | `(values?: Partial<T>) => void`          | Reset form                |
| `trigger(paths?)`                   | `(paths?: string[]) => Promise<boolean>` | Trigger validation        |
| `getFieldArray(path)`               | `(path: string) => FieldArrayMethods`    | Get field array helpers   |

### `<Field />` Component

```tsx
<Field
  form={form} // Required: Form instance
  name="fieldPath" // Required: Field path
  type="text" // Optional: Input type
  placeholder="..." // Optional: Placeholder text
  className="..." // Optional: CSS class
/>
```

### `useField(form, path)`

Hook for custom field implementations.

```tsx
const { value, error, isTouched, isDirty, onChange, onBlur } = useField(
  form,
  'name'
);
```

### `useFieldArray(form, path)`

Hook for dynamic field arrays.

```tsx
const { fields, append, prepend, remove, swap, move, update, replace } =
  useFieldArray(form, 'items');
```

## Migration Guide

<details>
<summary><strong>From React Hook Form</strong></summary>

```typescript
// Before
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});

// After
import { useUniversalForm } from '@samithahansaka/formless-react';
import { rhfAdapter } from '@samithahansaka/formless-react-hook-form';
import { zodBridge } from '@samithahansaka/formless-zod';

const form = useUniversalForm({
  schema: zodBridge(schema),
  adapter: rhfAdapter(),
});
```

</details>

<details>
<summary><strong>From Formik</strong></summary>

```typescript
// Before
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';

const formik = useFormik({
  initialValues,
  validationSchema: toFormikValidationSchema(schema),
});

// After
import { useUniversalForm } from '@samithahansaka/formless-react';
import { formikAdapter } from '@samithahansaka/formless-formik';
import { zodBridge } from '@samithahansaka/formless-zod';

const form = useUniversalForm({
  schema: zodBridge(schema),
  adapter: formikAdapter(),
  defaultValues: initialValues,
});
```

</details>

## Browser Support

| Browser | Version |
| ------- | ------- |
| Chrome  | 61+     |
| Firefox | 60+     |
| Safari  | 12+     |
| Edge    | 79+     |

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

```
formless/
├── packages/
│   ├── core/              # Core types and utilities
│   ├── react/             # React hooks and components
│   ├── react-hook-form/   # React Hook Form adapter
│   ├── formik/            # Formik adapter
│   ├── tanstack-form/     # TanStack Form adapter
│   └── zod/               # Zod schema bridge
└── examples/
    └── basic/             # Example application
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [Samitha Hansaka](https://github.com/samithahansaka)

---

<p align="center">
  <sub>Built with ❤️ for the React community</sub>
</p>
