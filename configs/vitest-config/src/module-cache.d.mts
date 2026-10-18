import type { Plugin } from 'vitest/config';

export declare const VITEST_MODULE_CACHE_PATH: string;

export declare const MODULE_CACHE_TEST_OPTIONS: {
  fsModuleCache: true;
  fsModuleCachePath: string;
};

export interface iModuleCacheKeyPluginOptions {
  /** The workspace folder, whose node_modules holds the transformer packages. */
  rootDirectory: string;
  /** Files the transform plugins read on their own, such as the tsconfig SWC compiles with. */
  configFilePaths: string[];
  /** Direct dependencies that transform source, so an upgrade invalidates their cached output. */
  transformerPackageNames: string[];
}

export declare const moduleCacheKeyPlugin: (options: iModuleCacheKeyPluginOptions) => Plugin;
