# @samithahansaka/formless-zod

[![npm](https://img.shields.io/npm/v/@samithahansaka/formless-zod?style=flat-square)](https://www.npmjs.com/package/@samithahansaka/formless-zod)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-zod?style=flat-square)](https://bundlephobia.com/package/@samithahansaka/formless-zod)
[![license](https://img.shields.io/npm/l/@samithahansaka/formless-zod?style=flat-square)](https://github.com/samithahansaka/formless/blob/master/LICENSE)

**Zod schema bridge for Formless** - the universal form adapter for React.

| Bundle Size | Minified | Gzipped |
| ----------- | -------- | ------- |
| ESM         | 8.57 KB  | ~2.5 KB |

This package provides integration with [Zod](https://zod.dev/), the TypeScript-first schema validation library.

## Installation

```bash
npm install @samithahansaka/formless-zod zod
```

> **Note:** For most users, we recommend installing `@samithahansaka/formless` which includes this package and all adapters.

## Usage

```tsx
import { z } from 'zod';
import { useUniversalForm } from '@samithahansaka/formless-react';
import { rhfAdapter } from '@samithahansaka/formless-react-hook-form';
import { zodBridge } from '@samithahansaka/formless-zod';

// Define your schema
const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18'),
  website: z.string().url().optional(),
});

// Create the bridge
const schema = zodBridge(userSchema);

// Use in your form
const form = useUniversalForm({
  adapter: rhfAdapter(),
  schema,
  defaultValues: {
    name: '',
    email: '',
    age: 0,
    website: '',
  },
});
```

## Type Inference

The `zodBridge` function preserves full type information:

```typescript
import { z } from 'zod';
import { zodBridge, type InferZodSchema } from '@samithahansaka/formless-zod';

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Infer the type from the schema
type User = InferZodSchema<typeof userSchema>;
// { name: string; email: string }

const schema = zodBridge(userSchema);
// schema is SchemaBridge<typeof userSchema, User>
```

## Supported Zod Features

- **Primitives**: `string`, `number`, `boolean`, `date`, `bigint`
- **Objects**: `object`, `partial`, `required`, `pick`, `omit`
- **Arrays**: `array`, `tuple`
- **Unions**: `union`, `discriminatedUnion`, `intersection`
- **Refinements**: `refine`, `superRefine`, `transform`
- **Optional/Nullable**: `optional`, `nullable`, `nullish`
- **Defaults**: `default`
- **Effects**: `preprocess`, `transform`

## Validation Modes

The schema bridge respects the validation mode set in your form:

```tsx
const form = useUniversalForm({
  adapter: rhfAdapter(),
  schema: zodBridge(userSchema),
  mode: 'onBlur', // Validate on blur
  // mode: 'onChange', // Validate on every change
  // mode: 'onSubmit', // Validate only on submit
  // mode: 'all',      // Validate on all events
});
```

## Error Messages

Zod error messages are automatically converted to Formless error format:

```typescript
const schema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email'),
});

// Errors are accessible via form.errors
// { email: { message: 'Please enter a valid email', type: 'validation' } }
```

## Documentation

For full documentation, visit the [main repository](https://github.com/samithahansaka/formless).

## License

MIT
