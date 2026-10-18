import type { UserConfig } from 'vite';

export declare const withWorkspaceSourceResolve: (
  alias?: Record<string, string>,
) => Pick<UserConfig, 'resolve' | 'ssr'>;
