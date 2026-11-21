export const EXACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

export const CATALOG_REFERENCE = 'catalog:';

export const ROOT_WORKSPACE = '.';

export const LINT_TOOLCHAIN_WORKSPACE = 'configs/lint-config';

/** Catalog entries the lint toolchain uses without `configs/lint-config` referencing them. */
export const LINT_TOOLCHAIN_EXTRA_CATALOG_ENTRIES = ['@typescript/native-preview'];

/** Repository catalog entries that belong to the repository itself and that no module ships. */
export const REPOSITORY_ONLY_CATALOG_ENTRIES: string[] = [];
