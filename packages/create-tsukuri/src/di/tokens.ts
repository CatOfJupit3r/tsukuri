/** Absolute directory the module sources (files, fragments, skills) are read from. */
export const SOURCE_ROOT_TOKEN = Symbol.for('create-tsukuri.source-root');

/** Raw module manifests, validated by `ModuleRegistry`. */
export const MODULE_MANIFESTS_TOKEN = Symbol.for('create-tsukuri.module-manifests');
