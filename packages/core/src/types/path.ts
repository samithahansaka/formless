/**
 * Deep path types for type-safe nested field access
 * Supports paths like "user.profile.name" or "items.0.value"
 */

type Primitive = string | number | boolean | null | undefined | Date;

type IsTuple<T extends readonly unknown[]> = number extends T['length']
  ? false
  : true;

type TupleKeys<T extends readonly unknown[]> = Exclude<keyof T, keyof []>;

type ArrayKey = number;

type PathImpl<K extends string | number, V> = V extends Primitive
  ? `${K}`
  : `${K}` | `${K}.${Path<V>}`;

/**
 * Generate all possible paths for a given type
 * @example Path<{ user: { name: string } }> = "user" | "user.name"
 */
export type Path<T> = T extends readonly (infer V)[]
  ? IsTuple<T> extends true
    ? {
        [K in TupleKeys<T>]-?: PathImpl<K & string, T[K]>;
      }[TupleKeys<T>]
    : PathImpl<ArrayKey, V>
  : {
      [K in keyof T]-?: PathImpl<K & string, T[K]>;
    }[keyof T];

/**
 * Get the type at a given path
 * @example PathValue<{ user: { name: string } }, "user.name"> = string
 */
export type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? R extends Path<T[K]>
      ? PathValue<T[K], R>
      : never
    : K extends `${ArrayKey}`
      ? T extends readonly (infer V)[]
        ? R extends Path<V>
          ? PathValue<V, R>
          : never
        : never
      : never
  : P extends keyof T
    ? T[P]
    : P extends `${ArrayKey}`
      ? T extends readonly (infer V)[]
        ? V
        : never
      : never;

/**
 * Set the type at a given path
 */
export type SetPathValue<T, P extends Path<T>, V> = P extends keyof T
  ? { [K in keyof T]: K extends P ? V : T[K] }
  : P extends `${infer K}.${infer R}`
    ? K extends keyof T
      ? R extends Path<T[K]>
        ? {
            [Key in keyof T]: Key extends K ? SetPathValue<T[K], R, V> : T[Key];
          }
        : never
      : never
    : never;

/**
 * Extract array element type for field arrays
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;
