/** Absolute directory the module sources (files, fragments, skills) are read from. */
export const SOURCE_ROOT_TOKEN = Symbol.for('create-tsukuri.source-root');

/** Whether the source root is a repository checkout or the published bundle; see `SourceLayout`. */
export const SOURCE_LAYOUT_TOKEN = Symbol.for('create-tsukuri.source-layout');

/** Raw module manifests, validated by `ModuleRegistry`. */
export const MODULE_MANIFESTS_TOKEN = Symbol.for('create-tsukuri.module-manifests');
