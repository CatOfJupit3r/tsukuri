import type { UserConfig } from 'vite';

export interface iWorkspaceSourceResolveOptions {
  /** Set by Vitest configs: Node then resolves the SSR conditions itself. */
  isTest?: boolean;
}

export declare const withWorkspaceSourceResolve: (
  options?: iWorkspaceSourceResolveOptions,
) => Pick<UserConfig, 'resolve' | 'ssr'>;
