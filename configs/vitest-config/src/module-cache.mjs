import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Workspace-local, so the caches of different workspaces never mix. */
export const VITEST_MODULE_CACHE_PATH = 'node_modules/.vitest-module-cache';

/** Vitest `test.experimental` settings that keep transformed modules on disk between runs. */
export const MODULE_CACHE_TEST_OPTIONS = {
  fsModuleCache: true,
  fsModuleCachePath: VITEST_MODULE_CACHE_PATH,
};

const readInstalledVersion = (rootDirectory, packageName) => {
  const packageManifest = JSON.parse(
    readFileSync(path.join(rootDirectory, 'node_modules', packageName, 'package.json'), 'utf8'),
  );

  return `${packageName}@${packageManifest.version}`;
};

/**
 * Vitest's module cache keys a transform on the file, the Vitest config and the plugin names only. This adds what
 * the transform plugins read besides that, so a tsconfig edit or a transformer upgrade invalidates cached output.
 *
 * @param {Object} options
 * @param {string} options.rootDirectory - The workspace folder, whose node_modules holds the transformer packages
 * @param {string[]} options.configFilePaths - Files the transform plugins read on their own, such as the tsconfig SWC compiles with
 * @param {string[]} options.transformerPackageNames - Direct dependencies that transform source
 */
export const moduleCacheKeyPlugin = ({ rootDirectory, configFilePaths, transformerPackageNames }) => {
  const transformInputs = JSON.stringify({
    configFiles: configFilePaths.map((configFilePath) => readFileSync(configFilePath, 'utf8')),
    transformers: transformerPackageNames.map((packageName) => readInstalledVersion(rootDirectory, packageName)),
  });

  return {
    name: 'startername:module-cache-key',
    configureVitest({ experimental_defineCacheKeyGenerator }) {
      experimental_defineCacheKeyGenerator(() => transformInputs);
    },
  };
};
