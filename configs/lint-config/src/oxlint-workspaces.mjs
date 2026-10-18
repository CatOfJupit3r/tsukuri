/**
 * One oxlint run for every workspace. Each workspace's own oxlint config is scoped to its folder, so the root run
 * reports what the workspace runs report while loading the shared lint config once.
 */
const NEGATION_PREFIX = '!';
const CURRENT_DIRECTORY_PREFIX = './';
const ANY_DEPTH_PREFIX = '**/';
/** Oxlint reads these only at the top level, so every workspace must agree on them. */
const ROOT_ONLY_KEYS = ['categories', 'options', 'env'];

/**
 * Rebases a gitignore-style pattern from a workspace folder onto the repository root. A pattern without an inner
 * slash matches at any depth below its folder, so it keeps that meaning under the workspace prefix.
 */
const toRootIgnorePattern = (workspaceDirectory, pattern) => {
  const isNegated = pattern.startsWith(NEGATION_PREFIX);
  const body = (isNegated ? pattern.slice(NEGATION_PREFIX.length) : pattern).replace(CURRENT_DIRECTORY_PREFIX, '');
  const isAnchored = body.startsWith(ANY_DEPTH_PREFIX) || body.slice(0, -1).includes('/');
  const rootPattern = isAnchored ? `${workspaceDirectory}/${body}` : `${workspaceDirectory}/${ANY_DEPTH_PREFIX}${body}`;

  return isNegated ? `${NEGATION_PREFIX}${rootPattern}` : rootPattern;
};

const toRootFilePattern = (workspaceDirectory, pattern) => `${workspaceDirectory}/${pattern}`;

const toRootOverride = (workspaceDirectory, override) => ({
  ...override,
  files: override.files.map((pattern) => toRootFilePattern(workspaceDirectory, pattern)),
  ...(override.excludeFiles
    ? { excludeFiles: override.excludeFiles.map((pattern) => toRootFilePattern(workspaceDirectory, pattern)) }
    : {}),
});

/**
 * @param {Array<{ directory: string, config: Object }>} workspaceConfigs - Workspace folder relative to the root and
 *   that workspace's oxlint config
 * @returns {Object} Oxlint config for the repository root
 */
export const createWorkspacesOxlintConfig = (workspaceConfigs) => {
  const [{ config: firstConfig }] = workspaceConfigs;
  const divergingWorkspace = workspaceConfigs.find(({ config }) =>
    ROOT_ONLY_KEYS.some((key) => JSON.stringify(config[key]) !== JSON.stringify(firstConfig[key])),
  );

  if (divergingWorkspace) {
    throw new Error(
      `${divergingWorkspace.directory} sets ${ROOT_ONLY_KEYS.join(', ')} differently from the other workspaces; oxlint overrides cannot scope them.`,
    );
  }

  return {
    $schema: firstConfig.$schema,
    categories: firstConfig.categories,
    options: firstConfig.options,
    env: firstConfig.env,
    plugins: [...new Set(workspaceConfigs.flatMap(({ config }) => config.plugins))],
    settings: Object.assign({}, ...workspaceConfigs.map(({ config }) => config.settings ?? {})),
    ignorePatterns: workspaceConfigs.flatMap(({ directory, config }) =>
      (config.ignorePatterns ?? []).map((pattern) => toRootIgnorePattern(directory, pattern)),
    ),
    overrides: workspaceConfigs.flatMap(({ directory, config }) => [
      {
        files: [toRootFilePattern(directory, '**/*')],
        plugins: config.plugins,
        env: config.env,
        ...(config.globals ? { globals: config.globals } : {}),
        rules: config.rules,
      },
      ...config.overrides.map((override) => toRootOverride(directory, override)),
    ]),
  };
};
