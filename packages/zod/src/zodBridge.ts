import { z } from 'zod';
import type {
  SchemaBridge,
  ValidationResult,
  ValidationError,
  FieldSchema,
  FieldType,
} from '@samithahansaka/formless-core';

/**
 * Type helper to infer the output type from a Zod schema
 */
export type InferZodSchema<T extends z.ZodType> = z.infer<T>;

// In zod 4, every schema exposes `_def.type` as a string discriminator
// (e.g. 'object', 'string', 'optional'). This replaces the zod 3 `_def.typeName`.
function getZodType(schema: z.ZodType): string {
  return (schema._def as { type?: string }).type ?? 'unknown';
}

// In zod 4, `.refine()` returns the same ZodType (no ZodEffects wrapper),
// so the only top-level shape we accept is a plain ZodObject.
type ZodBridgeableSchema = z.ZodObject<z.ZodRawShape>;

function getInnerObject(
  schema: z.ZodType
): z.ZodObject<z.ZodRawShape> | undefined {
  return getZodType(schema) === 'object'
    ? (schema as z.ZodObject<z.ZodRawShape>)
    : undefined;
}

// Shape of an entry in `_def.checks` at runtime in zod 4.
interface ZodCheckLike {
  _zod?: {
    def?: {
      check?: string;
      format?: string;
      minimum?: number;
      maximum?: number;
      value?: number;
      pattern?: RegExp;
    };
  };
}

/**
 * Zod schema bridge implementation
 */
class ZodSchemaBridge<
  TSchema extends ZodBridgeableSchema,
> implements SchemaBridge<TSchema, z.infer<TSchema>> {
  readonly schema: TSchema;
  readonly type = 'zod';
  private readonly innerObject: z.ZodObject<z.ZodRawShape>;

  constructor(schema: TSchema) {
    this.schema = schema;
    const inner = getInnerObject(schema);
    if (!inner) {
      throw new Error('zodBridge requires a ZodObject schema');
    }
    this.innerObject = inner;
  }

  validate(data: unknown): ValidationResult<z.infer<TSchema>> {
    const result = this.schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, errors: this.formatZodErrors(result.error) };
  }

  async validateAsync(
    data: unknown
  ): Promise<ValidationResult<z.infer<TSchema>>> {
    const result = await this.schema.safeParseAsync(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, errors: this.formatZodErrors(result.error) };
  }

  // Zod 4 renamed `ZodError.errors` to `.issues`.
  private formatZodErrors(error: z.ZodError): ValidationError[] {
    return error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      type: issue.code,
    }));
  }

  getFieldSchema(path: string): FieldSchema | undefined {
    const segments = path.split('.');
    let currentSchema: z.ZodType = this.innerObject;

    for (const segment of segments) {
      const unwrapped = this.unwrapSchema(currentSchema);
      const t = getZodType(unwrapped);

      if (t === 'object') {
        const shape = (unwrapped as z.ZodObject<z.ZodRawShape>).shape;
        if (segment in shape) {
          currentSchema = shape[segment] as unknown as z.ZodType;
        } else {
          return undefined;
        }
      } else if (t === 'array') {
        if (/^\d+$/.test(segment)) {
          const element = (unwrapped._def as { element?: z.ZodType }).element;
          if (!element) return undefined;
          currentSchema = element;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }

    return this.zodToFieldSchema(currentSchema);
  }

  private zodToFieldSchema(schema: z.ZodType): FieldSchema {
    const unwrapped = this.unwrapSchema(schema);
    const t = getZodType(unwrapped);

    const fieldSchema: FieldSchema = {
      type: this.getFieldType(t),
      required: !this.isOptional(schema),
      defaultValue: this.getSchemaDefault(schema),
    };

    const def = unwrapped._def as unknown as Record<string, unknown>;

    if ('description' in def && def.description) {
      fieldSchema.description = def.description as string;
    }

    if (t === 'string' || t === 'number') {
      const checks = (def.checks as ZodCheckLike[]) ?? [];
      for (const check of checks) {
        const cd = check._zod?.def;
        if (!cd) continue;

        if (t === 'string') {
          if (cd.check === 'min_length') fieldSchema.min = cd.minimum;
          if (cd.check === 'max_length') fieldSchema.max = cd.maximum;
          if (cd.check === 'string_format' && cd.format === 'regex') {
            fieldSchema.pattern = cd.pattern;
          }
        } else {
          if (cd.check === 'greater_than') fieldSchema.min = cd.value;
          if (cd.check === 'less_than') fieldSchema.max = cd.value;
        }
      }
    }

    if (t === 'enum') {
      // Zod 4 stores enum members as an object `{ label: value }`.
      const entries = (def.entries as Record<string, unknown>) ?? {};
      fieldSchema.options = Object.values(entries).map(value => ({
        label: String(value),
        value: value as string | number,
      }));
    }

    if (t === 'object') {
      const shape = (unwrapped as z.ZodObject<z.ZodRawShape>).shape;
      fieldSchema.properties = {};
      for (const [key, value] of Object.entries(shape)) {
        fieldSchema.properties[key] = this.zodToFieldSchema(value as z.ZodType);
      }
    }

    if (t === 'array') {
      const element = (def.element as z.ZodType | undefined) ?? undefined;
      if (element) {
        fieldSchema.items = this.zodToFieldSchema(element);
      }
    }

    return fieldSchema;
  }

  private getFieldType(t: string): FieldType {
    switch (t) {
      case 'string':
        return 'string';
      case 'number':
      case 'bigint':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'date';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      case 'enum':
        return 'enum';
      default:
        return 'unknown';
    }
  }

  // Zod 4 wraps via `_def.innerType` for optional / nullable / default.
  private unwrapSchema(schema: z.ZodType): z.ZodType {
    const t = getZodType(schema);
    if (t === 'optional' || t === 'nullable' || t === 'default') {
      const inner = (schema._def as { innerType?: z.ZodType }).innerType;
      if (inner) return this.unwrapSchema(inner);
    }
    return schema;
  }

  private isOptional(schema: z.ZodType): boolean {
    const t = getZodType(schema);
    return t === 'optional' || t === 'nullable' || t === 'default';
  }

  // Zod 4 eagerly resolves `.default(...)` at construction; `_def.defaultValue`
  // is the value itself, not a thunk.
  private getSchemaDefault(schema: z.ZodType): unknown {
    if (getZodType(schema) === 'default') {
      return (schema._def as unknown as { defaultValue: unknown }).defaultValue;
    }
    return undefined;
  }

  getDefaultValues(): Partial<z.infer<TSchema>> {
    const result: Record<string, unknown> = {};
    const shape = this.innerObject.shape;

    for (const [key, value] of Object.entries(shape)) {
      const defaultValue = this.extractDefaultValue(value as z.ZodType);
      if (defaultValue !== undefined) {
        result[key] = defaultValue;
      } else {
        const fieldType = this.getFieldType(
          getZodType(this.unwrapSchema(value as z.ZodType))
        );
        result[key] = this.getEmptyDefault(fieldType);
      }
    }

    return result as Partial<z.infer<TSchema>>;
  }

  private extractDefaultValue(schema: z.ZodType): unknown {
    const t = getZodType(schema);
    if (t === 'default') {
      return (schema._def as unknown as { defaultValue: unknown }).defaultValue;
    }
    if (t === 'optional' || t === 'nullable') {
      const inner = (schema._def as { innerType?: z.ZodType }).innerType;
      if (inner) return this.extractDefaultValue(inner);
    }
    return undefined;
  }

  private getEmptyDefault(fieldType: FieldType): unknown {
    switch (fieldType) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return undefined;
    }
  }

  getFieldDefault(path: string): unknown {
    const fieldSchema = this.getFieldSchema(path);
    if (fieldSchema?.defaultValue !== undefined) {
      return fieldSchema.defaultValue;
    }
    return this.getEmptyDefault(fieldSchema?.type ?? 'unknown');
  }

  isAsync(): boolean {
    return true;
  }

  toJSONSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: this.schemaToJSONSchemaProperties(this.innerObject),
    };
  }

  private schemaToJSONSchemaProperties(
    schema: z.ZodObject<z.ZodRawShape>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const shape = schema.shape;
    for (const [key, value] of Object.entries(shape)) {
      result[key] = this.zodTypeToJSONSchema(value as z.ZodType);
    }
    return result;
  }

  private zodTypeToJSONSchema(schema: z.ZodType): Record<string, unknown> {
    const unwrapped = this.unwrapSchema(schema);
    const t = getZodType(unwrapped);

    switch (t) {
      case 'string':
        return { type: 'string' };
      case 'number':
        return { type: 'number' };
      case 'boolean':
        return { type: 'boolean' };
      case 'array': {
        const element = (unwrapped._def as { element?: z.ZodType }).element;
        return {
          type: 'array',
          items: element ? this.zodTypeToJSONSchema(element) : {},
        };
      }
      case 'object':
        return {
          type: 'object',
          properties: this.schemaToJSONSchemaProperties(
            unwrapped as z.ZodObject<z.ZodRawShape>
          ),
        };
      default:
        return {};
    }
  }
}

/**
 * Create a Zod schema bridge
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { zodBridge } from '@samithahansaka/formless-zod';
 *
 * const userSchema = z.object({
 *   email: z.string().email('Invalid email'),
 *   password: z.string().min(8, 'Min 8 characters'),
 *   age: z.number().min(18).optional(),
 * });
 *
 * // Also works with .refine()
 * const schemaWithRefine = userSchema.refine(
 *   data => data.password.length > 0,
 *   { message: 'Password required' }
 * );
 *
 * const form = useUniversalForm({
 *   schema: zodBridge(userSchema),
 *   adapter: rhfAdapter(),
 * });
 * ```
 */
export function zodBridge<TSchema extends ZodBridgeableSchema>(
  schema: TSchema
): SchemaBridge<TSchema, z.infer<TSchema>> {
  return new ZodSchemaBridge(schema);
}

/**
 * Type helper to infer form data type from a Zod bridge
 */
export type InferZodBridge<T> =
  T extends SchemaBridge<unknown, infer O> ? O : never;
