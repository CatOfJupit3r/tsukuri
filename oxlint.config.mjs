import { createWorkspacesOxlintConfig } from '@startername/lint-config/oxlint-workspaces';
import { globSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const WORKSPACE_OXLINT_CONFIG_GLOBS = ['apps/*/oxlint.config.mjs', 'packages/*/oxlint.config.mjs'];

const rootDirectory = import.meta.dirname;

const workspaceConfigs = await Promise.all(
  globSync(WORKSPACE_OXLINT_CONFIG_GLOBS, { cwd: rootDirectory }).map(async (configPath) => ({
    directory: path.dirname(configPath).replaceAll(path.sep, '/'),
    config: await (await import(pathToFileURL(path.join(rootDirectory, configPath)).href)).default,
  })),
);

export default createWorkspacesOxlintConfig(workspaceConfigs);
