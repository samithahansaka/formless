import { z } from 'zod';
import type {
  SchemaBridge,
  ValidationResult,
  ValidationError,
  FieldSchema,
  FieldType,
} from '@universal-form/core';

/**
 * Type helper to infer the output type from a Zod schema
 */
export type InferZodSchema<T extends z.ZodType> = z.infer<T>;

/**
 * Helper to get the Zod type name from a schema
 */
function getZodTypeName(schema: z.ZodType): string {
  return (schema._def as { typeName?: string }).typeName ?? 'Unknown';
}

/**
 * Type for schemas that can be used with zodBridge
 * Includes ZodObject and wrapped types like ZodEffects
 */
type ZodBridgeableSchema =
  | z.ZodObject<z.ZodRawShape>
  | z.ZodEffects<z.ZodObject<z.ZodRawShape>>
  | z.ZodEffects<z.ZodEffects<z.ZodObject<z.ZodRawShape>>>;

/**
 * Unwrap a schema to get the inner ZodObject
 */
function getInnerObject(
  schema: z.ZodType
): z.ZodObject<z.ZodRawShape> | undefined {
  const typeName = getZodTypeName(schema);

  if (typeName === 'ZodObject') {
    return schema as z.ZodObject<z.ZodRawShape>;
  }

  if (typeName === 'ZodEffects') {
    const innerSchema = (schema as z.ZodEffects<z.ZodType>)._def.schema;
    return getInnerObject(innerSchema);
  }

  return undefined;
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
      throw new Error(
        'zodBridge requires a ZodObject schema (or ZodEffects wrapping a ZodObject)'
      );
    }
    this.innerObject = inner;
  }

  /**
   * Validate data against the Zod schema (synchronous)
   */
  validate(data: unknown): ValidationResult<z.infer<TSchema>> {
    const result = this.schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors = this.formatZodErrors(result.error);
    return {
      success: false,
      errors,
    };
  }

  /**
   * Validate data against the Zod schema (asynchronous)
   */
  async validateAsync(
    data: unknown
  ): Promise<ValidationResult<z.infer<TSchema>>> {
    const result = await this.schema.safeParseAsync(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors = this.formatZodErrors(result.error);
    return {
      success: false,
      errors,
    };
  }

  /**
   * Format Zod errors into ValidationError array
   */
  private formatZodErrors(error: z.ZodError): ValidationError[] {
    return error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      type: err.code,
    }));
  }

  /**
   * Get field schema information for a specific path
   */
  getFieldSchema(path: string): FieldSchema | undefined {
    const segments = path.split('.');
    let currentSchema: z.ZodType = this.innerObject;

    for (const segment of segments) {
      const unwrapped = this.unwrapSchema(currentSchema);
      const typeName = getZodTypeName(unwrapped);

      if (typeName === 'ZodObject') {
        const shape = (unwrapped as z.ZodObject<z.ZodRawShape>).shape;
        if (segment in shape) {
          currentSchema = shape[segment];
        } else {
          return undefined;
        }
      } else if (typeName === 'ZodArray') {
        // For array access like "items.0", skip the index
        if (/^\d+$/.test(segment)) {
          currentSchema = (unwrapped as z.ZodArray<z.ZodType>).element;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }

    return this.zodToFieldSchema(currentSchema);
  }

  /**
   * Convert a Zod schema to FieldSchema
   */
  private zodToFieldSchema(schema: z.ZodType): FieldSchema {
    const unwrapped = this.unwrapSchema(schema);
    const typeName = getZodTypeName(unwrapped);

    const fieldSchema: FieldSchema = {
      type: this.getFieldType(typeName),
      required: !this.isOptional(schema),
      defaultValue: this.getSchemaDefault(schema),
    };

    // Extract additional constraints
    const def = unwrapped._def as Record<string, unknown>;

    if ('description' in def && def.description) {
      fieldSchema.description = def.description as string;
    }

    // Handle string constraints
    if (typeName === 'ZodString') {
      const checks =
        (def.checks as Array<{
          kind: string;
          value?: number;
          regex?: RegExp;
        }>) || [];
      for (const check of checks) {
        if (check.kind === 'min') fieldSchema.min = check.value;
        if (check.kind === 'max') fieldSchema.max = check.value;
        if (check.kind === 'regex') fieldSchema.pattern = check.regex;
      }
    }

    // Handle number constraints
    if (typeName === 'ZodNumber') {
      const checks =
        (def.checks as Array<{ kind: string; value?: number }>) || [];
      for (const check of checks) {
        if (check.kind === 'min') fieldSchema.min = check.value;
        if (check.kind === 'max') fieldSchema.max = check.value;
      }
    }

    // Handle enum
    if (typeName === 'ZodEnum' || typeName === 'ZodNativeEnum') {
      const values = def.values as string[];
      if (Array.isArray(values)) {
        fieldSchema.options = values.map((v: string) => ({
          label: String(v),
          value: v,
        }));
      }
    }

    // Handle object properties
    if (typeName === 'ZodObject') {
      const shape = (unwrapped as z.ZodObject<z.ZodRawShape>).shape;
      fieldSchema.properties = {};
      for (const [key, value] of Object.entries(shape)) {
        fieldSchema.properties[key] = this.zodToFieldSchema(value as z.ZodType);
      }
    }

    // Handle array items
    if (typeName === 'ZodArray') {
      fieldSchema.items = this.zodToFieldSchema(
        (unwrapped as z.ZodArray<z.ZodType>).element
      );
    }

    return fieldSchema;
  }

  /**
   * Get FieldType from Zod type name
   */
  private getFieldType(typeName: string): FieldType {
    switch (typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
      case 'ZodBigInt':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodDate':
        return 'date';
      case 'ZodArray':
        return 'array';
      case 'ZodObject':
        return 'object';
      case 'ZodEnum':
      case 'ZodNativeEnum':
        return 'enum';
      default:
        return 'unknown';
    }
  }

  /**
   * Unwrap optional, nullable, and default wrappers
   */
  private unwrapSchema(schema: z.ZodType): z.ZodType {
    const typeName = getZodTypeName(schema);

    if (typeName === 'ZodOptional') {
      return this.unwrapSchema((schema as z.ZodOptional<z.ZodType>).unwrap());
    }

    if (typeName === 'ZodNullable') {
      return this.unwrapSchema((schema as z.ZodNullable<z.ZodType>).unwrap());
    }

    if (typeName === 'ZodDefault') {
      return this.unwrapSchema(
        (schema as z.ZodDefault<z.ZodType>).removeDefault()
      );
    }

    return schema;
  }

  /**
   * Check if a schema is optional
   */
  private isOptional(schema: z.ZodType): boolean {
    const typeName = getZodTypeName(schema);
    if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
      return true;
    }
    if (typeName === 'ZodDefault') {
      return true; // Has default, so effectively optional
    }
    return false;
  }

  /**
   * Get default value from schema
   */
  private getSchemaDefault(schema: z.ZodType): unknown {
    const typeName = getZodTypeName(schema);
    if (typeName === 'ZodDefault') {
      const def = schema._def as { defaultValue: () => unknown };
      return def.defaultValue();
    }
    return undefined;
  }

  /**
   * Get default values for the entire schema
   */
  getDefaultValues(): Partial<z.infer<TSchema>> {
    const result: Record<string, unknown> = {};
    const shape = this.innerObject.shape;

    for (const [key, value] of Object.entries(shape)) {
      const defaultValue = this.extractDefaultValue(value as z.ZodType);
      if (defaultValue !== undefined) {
        result[key] = defaultValue;
      } else {
        // Set empty defaults based on type
        const fieldType = this.getFieldType(
          getZodTypeName(this.unwrapSchema(value as z.ZodType))
        );
        result[key] = this.getEmptyDefault(fieldType);
      }
    }

    return result as Partial<z.infer<TSchema>>;
  }

  /**
   * Extract default value from a schema recursively
   */
  private extractDefaultValue(schema: z.ZodType): unknown {
    const typeName = getZodTypeName(schema);

    if (typeName === 'ZodDefault') {
      const def = schema._def as { defaultValue: () => unknown };
      return def.defaultValue();
    }

    if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
      const inner = this.unwrapSchema(schema);
      return this.extractDefaultValue(inner);
    }

    return undefined;
  }

  /**
   * Get empty default value based on field type
   */
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

  /**
   * Get default value for a specific field
   */
  getFieldDefault(path: string): unknown {
    const fieldSchema = this.getFieldSchema(path);
    if (fieldSchema?.defaultValue !== undefined) {
      return fieldSchema.defaultValue;
    }
    return this.getEmptyDefault(fieldSchema?.type ?? 'unknown');
  }

  /**
   * Check if schema has async refinements
   */
  isAsync(): boolean {
    // Zod's safeParseAsync handles both sync and async validation
    // For now, assume potentially async
    return true;
  }

  /**
   * Convert to JSON Schema (basic implementation)
   */
  toJSONSchema(): Record<string, unknown> {
    // This is a simplified implementation
    // For full JSON Schema conversion, consider using zod-to-json-schema
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
    const typeName = getZodTypeName(unwrapped);

    switch (typeName) {
      case 'ZodString':
        return { type: 'string' };
      case 'ZodNumber':
        return { type: 'number' };
      case 'ZodBoolean':
        return { type: 'boolean' };
      case 'ZodArray':
        return {
          type: 'array',
          items: this.zodTypeToJSONSchema(
            (unwrapped as z.ZodArray<z.ZodType>).element
          ),
        };
      case 'ZodObject':
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
 * import { zodBridge } from '@universal-form/zod';
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
