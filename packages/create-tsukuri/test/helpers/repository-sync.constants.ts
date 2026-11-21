export const EXACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

export const CATALOG_REFERENCE = 'catalog:';

export const WORKSPACE_REFERENCE_PATTERN = /^workspace:/;

/** Workspaces whose every dependency belongs to the lint and format toolchain. */
export const LINT_CONFIG_WORKSPACE = 'configs/lint-config';

export const LINT_TOOLCHAIN_WORKSPACES = [LINT_CONFIG_WORKSPACE, 'configs/prettier-config'];

/** Lint tools the root workspace depends on directly, next to dependencies that are not lint tools. */
export const ROOT_LINT_TOOL_NAMES = ['husky', 'lint-staged', 'oxlint', 'oxlint-tsgolint'];

/** Root dependencies that release this repository and that no generated project receives. */
export const ROOT_REPOSITORY_ONLY_DEPENDENCY_NAMES = ['@changesets/changelog-github', '@changesets/cli'];
