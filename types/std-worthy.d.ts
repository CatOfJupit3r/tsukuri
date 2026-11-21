/**
 * Ambient utility types that are shared across the epherrom monorepo.
 *
 * Keep the surface lean and implementation-agnostic so packages can rely on
 * these helpers without creating accidental runtime dependencies.
 */

declare global {
	type UnknownRecord = Partial<Record<any, any>>;

	type Nil = null | undefined;
	type NonNil<T> = Exclude<T, Nil>;

	type Nullable<T> = T | null;

	type Optional<T> = T | undefined;

	type ValueOf<T> = T[keyof T];

	type Awaitable<T> = T | PromiseLike<T>;

	type EmptyObject = Record<never, never>;

	type Prettify<T> = T extends infer Resolved ? { [K in keyof Resolved]: Resolved[K] } : never;
	type Mutable<T> = {
			-readonly [P in keyof T]: T[P];
	};
}

export {};
