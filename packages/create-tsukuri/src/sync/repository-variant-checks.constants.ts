import type { ModuleId } from '#~/enums/module-ids.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';

export interface iRepositoryVariantCheck {
  /** Folder of variant files that replace files of `workspace` in a project. */
  directory: string;
  /** The workspace the variant files land in, such as `packages/api`. */
  workspace: string;
  /** A selection that installs the variant; its generated sources for `workspace` go into `directory`. */
  modules: readonly ModuleId[];
}

const SERVER_FEATURES = [MODULE_IDS.BETTER_AUTH, MODULE_IDS.EXAMPLE_DOMAIN];
const API_WORKSPACE = 'packages/api';

/**
 * Variant files are type-checked and linted here against the connection points a project that installs them
 * has, so each variant folder holds the generated sources of one such project.
 */
export const REPOSITORY_VARIANT_CHECKS: readonly iRepositoryVariantCheck[] = [
  {
    directory: `${API_WORKSPACE}/variants/sqlite`,
    workspace: API_WORKSPACE,
    modules: [MODULE_IDS.NODE_HONO, MODULE_IDS.SQLITE, ...SERVER_FEATURES],
  },
  {
    directory: `${API_WORKSPACE}/variants/d1`,
    workspace: API_WORKSPACE,
    modules: [MODULE_IDS.CLOUDFLARE_WORKER, MODULE_IDS.D1, MODULE_IDS.CLOUDFLARE_KV, ...SERVER_FEATURES],
  },
  {
    directory: `${API_WORKSPACE}/variants/postgres-hyperdrive`,
    workspace: API_WORKSPACE,
    modules: [MODULE_IDS.CLOUDFLARE_WORKER, MODULE_IDS.POSTGRES, ...SERVER_FEATURES],
  },
  {
    // The Worker's bindings come from the modules whose binding tokens live in the API package itself.
    directory: 'variants/cloudflare-worker/apps/worker',
    workspace: 'apps/worker',
    modules: [MODULE_IDS.CLOUDFLARE_WORKER, MODULE_IDS.CLOUDFLARE_KV],
  },
];
