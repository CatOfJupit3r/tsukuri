import type { iModuleManifestInput } from './module-manifest.schema';

/** Typed identity helper for module manifests; validation happens when the registry is loaded. */
export function defineModule(manifest: iModuleManifestInput) {
  return manifest;
}
