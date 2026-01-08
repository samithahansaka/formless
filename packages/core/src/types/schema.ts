/**
 * Schema Bridge Types
 *
 * A schema bridge connects a validation library (Zod, Yup, etc.)
 * to the Universal Form Adapter.
 */

/**
 * Result of validating data against a schema
 */
export interface ValidationResult<T> {
  /** Whether validation passed */
  success: boolean;
  /** Validated and transformed data (if success) */
  data?: T;
  /** Validation errors (if failed) */
  errors?: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  /** Dot-notation path to the field */
  path: string;
  /** Error message */
  message: string;
  /** Error type/code (e.g., 'required', 'min', 'email') */
  type?: string;
}

/**
 * Metadata about a field extracted from schema
 */
export interface FieldSchema {
  /** Field type (string, number, boolean, array, object) */
  type: FieldType;
  /** Whether field is required */
  required: boolean;
  /** Default value for the field */
  defaultValue?: unknown;
  /** Human-readable label (if specified in schema) */
  label?: string;
  /** Description/help text (if specified in schema) */
  description?: string;
  /** Minimum value/length */
  min?: number;
  /** Maximum value/length */
  max?: number;
  /** Pattern for string validation */
  pattern?: RegExp;
  /** Enum values for select fields */
  options?: Array<{ label: string; value: unknown }>;
  /** Nested schema for objects */
  properties?: Record<string, FieldSchema>;
  /** Item schema for arrays */
  items?: FieldSchema;
}

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'enum'
  | 'unknown';

/**
 * Schema bridge interface - connects validation libraries to UFA
 *
 * @template TSchema - The schema type (e.g., z.ZodObject, yup.ObjectSchema)
 * @template TOutput - The inferred output type from the schema
 */
export interface SchemaBridge<
  TSchema,
  TOutput extends Record<string, unknown>,
> {
  /** The original schema */
  readonly schema: TSchema;

  /** Name of the schema library (e.g., 'zod', 'yup') */
  readonly type: string;

  /**
   * Validate data against the schema
   * @param data - Raw data to validate
   * @returns Validation result with parsed data or errors
   */
  validate: (data: unknown) => ValidationResult<TOutput>;

  /**
   * Validate data asynchronously (for async schemas)
   * @param data - Raw data to validate
   * @returns Promise of validation result
   */
  validateAsync: (data: unknown) => Promise<ValidationResult<TOutput>>;

  /**
   * Get schema information for a specific field path
   * @param path - Dot-notation path to the field
   * @returns Field schema metadata
   */
  getFieldSchema: (path: string) => FieldSchema | undefined;

  /**
   * Get default values from the schema
   * @returns Default values object
   */
  getDefaultValues: () => Partial<TOutput>;

  /**
   * Get default value for a specific field
   * @param path - Dot-notation path to the field
   * @returns Default value for the field
   */
  getFieldDefault: (path: string) => unknown;

  /**
   * Check if schema has async validators
   * @returns Whether any validators are async
   */
  isAsync: () => boolean;

  /**
   * Transform schema to JSON Schema (for interoperability)
   * @returns JSON Schema representation
   */
  toJSONSchema?: () => Record<string, unknown>;
}

/**
 * Factory function type for creating schema bridges
 */
export type SchemaBridgeFactory<
  TSchema,
  TOutput extends Record<string, unknown>,
> = (schema: TSchema) => SchemaBridge<TSchema, TOutput>;

/**
 * Type helper to infer output type from a schema bridge
 */
export type InferSchemaBridgeOutput<T> =
  T extends SchemaBridge<unknown, infer O> ? O : never;
