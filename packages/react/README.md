# @samithahansaka/formless-react

[![npm](https://img.shields.io/npm/v/@samithahansaka/formless-react?style=flat-square)](https://www.npmjs.com/package/@samithahansaka/formless-react)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-react?style=flat-square)](https://bundlephobia.com/package/@samithahansaka/formless-react)
[![license](https://img.shields.io/npm/l/@samithahansaka/formless-react?style=flat-square)](https://github.com/samithahansaka/formless/blob/master/LICENSE)

**React hooks and components for Formless** - the universal form adapter for React.

| Bundle Size | Minified | Gzipped |
| ----------- | -------- | ------- |
| ESM         | 12.31 KB | ~3.5 KB |

This package provides the React bindings including hooks, components, and context providers.

## Installation

```bash
npm install @samithahansaka/formless-react @samithahansaka/formless-core
```

> **Note:** For most users, we recommend installing `@samithahansaka/formless` which includes this package and all adapters.

## Hooks

### useUniversalForm

Main hook for creating a form instance.

```tsx
import { useUniversalForm } from '@samithahansaka/formless-react';

const form = useUniversalForm({
  adapter: myAdapter(),
  schema: mySchema,
  defaultValues: { name: '', email: '' },
  mode: 'onBlur',
});
```

**Returns:**

- `values` - Current form values
- `errors` - Validation errors
- `isSubmitting`, `isValid`, `isDirty` - Form state
- `getValue(path)`, `setValue(path, value)` - Value accessors
- `getError(path)`, `setError(path, error)` - Error accessors
- `register(path)` - Field registration
- `handleSubmit(onValid, onInvalid?)` - Submit handler
- `reset(values?)` - Reset form
- `trigger(paths?)` - Trigger validation

### useField

Hook for individual field state.

```tsx
import { useField } from '@samithahansaka/formless-react';

const { value, error, isTouched, isDirty, onChange, onBlur } = useField(
  form,
  'email'
);
```

### useFieldArray

Hook for dynamic field arrays.

```tsx
import { useFieldArray } from '@samithahansaka/formless-react';

const { fields, append, remove, swap, move } = useFieldArray(form, 'items');
```

### useWatch

Hook for watching specific field values.

```tsx
import { useWatch } from '@samithahansaka/formless-react';

const email = useWatch(form, 'email');
const [name, age] = useWatch(form, ['name', 'age']);
```

## Components

### Field

Simple field component with automatic registration.

```tsx
import { Field } from '@samithahansaka/formless-react';

<Field form={form} name="email" type="email" placeholder="Email" />;
```

### FieldArray

Component for rendering dynamic arrays.

```tsx
import { FieldArray } from '@samithahansaka/formless-react';

<FieldArray form={form} name="items">
  {({ fields, append, remove }) => (
    <>
      {fields.map((field, index) => (
        <div key={field.id}>
          <Field form={form} name={`items.${index}.name`} />
          <button onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button onClick={() => append({ name: '' })}>Add Item</button>
    </>
  )}
</FieldArray>;
```

### Form

Form wrapper with context provider.

```tsx
import { Form } from '@samithahansaka/formless-react';

<Form form={form} onSubmit={handleSubmit}>
  <Field name="email" />
  <button type="submit">Submit</button>
</Form>;
```

## Context

### FormProvider / useFormContext

Share form instance via context.

```tsx
import { FormProvider, useFormContext } from '@samithahansaka/formless-react';

// Parent
<FormProvider form={form}>
  <MyFields />
</FormProvider>;

// Child
function MyFields() {
  const form = useFormContext();
  return <Field form={form} name="email" />;
}
```

## Documentation

For full documentation, visit the [main repository](https://github.com/samithahansaka/formless).

## License

MIT
