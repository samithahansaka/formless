# @samithahansaka/formless-core

[![npm](https://img.shields.io/npm/v/@samithahansaka/formless-core?style=flat-square)](https://www.npmjs.com/package/@samithahansaka/formless-core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@samithahansaka/formless-core?style=flat-square)](https://bundlephobia.com/package/@samithahansaka/formless-core)
[![license](https://img.shields.io/npm/l/@samithahansaka/formless-core?style=flat-square)](https://github.com/samithahansaka/formless/blob/master/LICENSE)

**Core types and utilities for Formless** - the universal form adapter for React.

| Bundle Size | Minified | Gzipped |
| ----------- | -------- | ------- |
| ESM         | 8.63 KB  | ~2.5 KB |

This package contains the foundational types, interfaces, and utilities used by all Formless packages. It has no React dependencies and can be used with any framework.

## Installation

```bash
npm install @samithahansaka/formless-core
```

> **Note:** For most users, we recommend installing `@samithahansaka/formless` which includes this package and all adapters.

## What's Included

### Types

- **Path Types**: `Path`, `PathValue`, `SetPathValue`, `ArrayElement`
- **Form Types**: `FieldError`, `FormErrors`, `FormState`, `FieldState`, `ValidationMode`
- **Schema Types**: `SchemaBridge`, `ValidationResult`, `ValidationError`, `FieldSchema`
- **Adapter Types**: `EngineAdapter`, `AdapterConfig`, `EngineAdapterFactory`
- **Config Types**: `UniversalFormConfig`, `ResolvedFormConfig`

### Utilities

#### Path Utilities

```typescript
import { getByPath, setByPath, parsePath } from '@samithahansaka/formless-core';

const obj = { user: { name: 'John' } };
getByPath(obj, 'user.name'); // 'John'
setByPath(obj, 'user.age', 30); // { user: { name: 'John', age: 30 } }
```

#### Error Utilities

```typescript
import {
  normalizeFieldError,
  mergeErrors,
} from '@samithahansaka/formless-core';

normalizeFieldError('Required'); // { message: 'Required', type: 'validation' }
```

#### Comparison Utilities

```typescript
import { deepEqual, shallowEqual } from '@samithahansaka/formless-core';

deepEqual({ a: 1 }, { a: 1 }); // true
```

#### ID Utilities

```typescript
import { generateId } from '@samithahansaka/formless-core';

generateId(); // 'field_1'
```

## Creating Custom Adapters

This package provides the `EngineAdapter` interface for creating custom form engine adapters:

```typescript
import type {
  EngineAdapter,
  AdapterConfig,
} from '@samithahansaka/formless-core';

function myCustomAdapter(): EngineAdapter<MyEngine> {
  return {
    name: 'my-adapter',
    version: '1.0',

    createForm(config: AdapterConfig) {
      // Initialize your form engine
    },

    getState(engine) {
      // Return current form state
    },

    setValue(engine, path, value) {
      // Set field value
    },

    // ... implement other methods
  };
}
```

## Creating Custom Schema Bridges

Create custom schema bridges using the `SchemaBridge` interface:

```typescript
import type { SchemaBridge } from '@samithahansaka/formless-core';

function mySchemaValidator<T>(schema: MySchema): SchemaBridge<MySchema, T> {
  return {
    validate(data) {
      // Validate and return result
      return { success: true, data };
    },

    getFieldSchema(path) {
      // Return field metadata
    },

    getDefaultValues() {
      // Return default values from schema
    },
  };
}
```

## Documentation

For full documentation, visit the [main repository](https://github.com/samithahansaka/formless).

## License

MIT
