/** Generic shared utility types — no business entity types yet. */

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type ValueOf<T> = T[keyof T];
