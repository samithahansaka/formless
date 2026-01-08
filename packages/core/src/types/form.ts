/**
 * Form field error - can be a string message or nested errors
 */
export type FieldError = {
  message?: string;
  type?: string;
  ref?: unknown;
};

/**
 * Recursive type for form errors matching form shape
 */
export type FormErrors<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? FormErrors<U>[] | FieldError
    : T[K] extends object
      ? FormErrors<T[K]>
      : FieldError;
} & {
  root?: FieldError;
};

/**
 * Recursive type for touched fields matching form shape
 */
export type FormTouched<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? FormTouched<U>[]
    : T[K] extends object
      ? FormTouched<T[K]>
      : boolean;
};

/**
 * Recursive type for dirty fields matching form shape
 */
export type FormDirty<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? FormDirty<U>[]
    : T[K] extends object
      ? FormDirty<T[K]>
      : boolean;
};

/**
 * Form validation mode
 */
export type ValidationMode =
  | 'onSubmit'
  | 'onBlur'
  | 'onChange'
  | 'onTouched'
  | 'all';

/**
 * Form state at any point in time
 */
export interface FormState<T> {
  /** Current form values */
  values: T;
  /** Current form errors */
  errors: FormErrors<T>;
  /** Which fields have been touched */
  touched: FormTouched<T>;
  /** Which fields are dirty (modified) */
  dirty: FormDirty<T>;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Whether form is currently validating */
  isValidating: boolean;
  /** Whether form has any errors */
  isValid: boolean;
  /** Whether any field has been modified */
  isDirty: boolean;
  /** Number of times form has been submitted */
  submitCount: number;
}

/**
 * Field-level state
 */
export interface FieldState {
  /** Whether field has been touched (blurred) */
  isTouched: boolean;
  /** Whether field value differs from default */
  isDirty: boolean;
  /** Current field error, if any */
  error?: FieldError;
  /** Whether field is currently invalid */
  isInvalid: boolean;
}

/**
 * Props for registering a field with the form
 */
export interface FieldRegisterProps {
  name: string;
  onBlur: (event: unknown) => void;
  onChange: (event: unknown) => void;
  ref: (instance: unknown) => void;
}

/**
 * Field array helpers for managing arrays of fields
 */
export interface FieldArrayMethods<TFieldValue> {
  /** All fields in the array */
  fields: Array<TFieldValue & { id: string }>;
  /** Append a new item to the array */
  append: (value: TFieldValue, options?: { shouldFocus?: boolean }) => void;
  /** Prepend a new item to the start of the array */
  prepend: (value: TFieldValue, options?: { shouldFocus?: boolean }) => void;
  /** Insert an item at a specific index */
  insert: (
    index: number,
    value: TFieldValue,
    options?: { shouldFocus?: boolean }
  ) => void;
  /** Remove an item at a specific index */
  remove: (index: number | number[]) => void;
  /** Swap two items in the array */
  swap: (indexA: number, indexB: number) => void;
  /** Move an item from one index to another */
  move: (from: number, to: number) => void;
  /** Update an item at a specific index */
  update: (index: number, value: TFieldValue) => void;
  /** Replace the entire array */
  replace: (values: TFieldValue[]) => void;
}

/**
 * Universal form return type - the main API surface
 * Uses string paths for simplicity; type-safe path helpers available separately
 */
export interface UniversalFormReturn<T extends Record<string, unknown>> {
  // ═══════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════

  /** Get current form state */
  getState: () => FormState<T>;

  /** Current form values */
  values: T;

  /** Current form errors */
  errors: FormErrors<T>;

  /** Whether form is valid */
  isValid: boolean;

  /** Whether form is submitting */
  isSubmitting: boolean;

  /** Whether form is dirty */
  isDirty: boolean;

  // ═══════════════════════════════════════════════════════
  // VALUE OPERATIONS
  // ═══════════════════════════════════════════════════════

  /** Get value at a specific path */
  getValue: (path: string) => unknown;

  /** Set value at a specific path */
  setValue: (
    path: string,
    value: unknown,
    options?: { shouldValidate?: boolean; shouldDirty?: boolean }
  ) => void;

  /** Set multiple values at once */
  setValues: (
    values: Partial<T>,
    options?: { shouldValidate?: boolean }
  ) => void;

  // ═══════════════════════════════════════════════════════
  // ERROR OPERATIONS
  // ═══════════════════════════════════════════════════════

  /** Get error at a specific path */
  getError: (path: string) => FieldError | undefined;

  /** Set error at a specific path */
  setError: (path: string, error: FieldError | string) => void;

  /** Clear error at a specific path, or all errors if no path */
  clearErrors: (path?: string | string[]) => void;

  // ═══════════════════════════════════════════════════════
  // FIELD REGISTRATION
  // ═══════════════════════════════════════════════════════

  /** Register a field with the form */
  register: (path: string) => FieldRegisterProps;

  /** Get state for a specific field */
  getFieldState: (path: string) => FieldState;

  // ═══════════════════════════════════════════════════════
  // FORM OPERATIONS
  // ═══════════════════════════════════════════════════════

  /** Reset form to default values or provided values */
  reset: (values?: Partial<T>, options?: { keepErrors?: boolean }) => void;

  /** Trigger validation for specific paths or entire form */
  trigger: (path?: string | string[]) => Promise<boolean>;

  /** Handle form submission */
  handleSubmit: (
    onValid: (data: T) => void | Promise<void>,
    onInvalid?: (errors: FormErrors<T>) => void
  ) => (event?: { preventDefault?: () => void }) => Promise<void>;

  // ═══════════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════

  /** Watch a specific path or entire form for changes */
  watch: (pathOrPaths?: string | string[]) => unknown;

  /** Subscribe to form state changes */
  subscribe: (callback: (state: FormState<T>) => void) => () => void;

  // ═══════════════════════════════════════════════════════
  // FIELD ARRAYS
  // ═══════════════════════════════════════════════════════

  /** Get field array helpers for a path */
  getFieldArray: <TItem = unknown>(path: string) => FieldArrayMethods<TItem>;

  // ═══════════════════════════════════════════════════════
  // INTERNAL / ADVANCED
  // ═══════════════════════════════════════════════════════

  /** Get the underlying engine instance (for escape hatches) */
  getEngine: () => unknown;

  /** Form context for providers */
  context: UniversalFormContext<T>;
}

/**
 * Context type for form providers
 */
export interface UniversalFormContext<T extends Record<string, unknown>> {
  form: UniversalFormReturn<T>;
}
