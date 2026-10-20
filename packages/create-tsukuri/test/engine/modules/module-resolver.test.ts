import { createGeneratorContainer } from '#~/di/container';
import { ModuleRegistry } from '#~/engine/modules/module-registry';
import { ModuleResolver } from '#~/engine/modules/module-resolver';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';

import { createManifest, testModuleId } from '../../helpers/manifests';

vi.mock('#~/enums/module-ids.enums', () => import('../../helpers/test-module-ids'));

const BASE = testModuleId('base');
const ALPHA = testModuleId('alpha');
const BETA = testModuleId('beta');
const GAMMA = testModuleId('gamma');
const DELTA = testModuleId('delta');

function createResolver(manifests: iModuleManifestInput[]) {
  return createGeneratorContainer({ sourceRoot: '/unused', manifests }).resolve(ModuleResolver);
}

function idsOf(result: ReturnType<ModuleResolver['resolve']>) {
  return result.modules.map((manifest) => manifest.id);
}

describe('ModuleResolver', () => {
  const base = createManifest(BASE, { category: MODULE_CATEGORIES.BASE, isAlwaysIncluded: true });

  it('always includes modules marked as always included', () => {
    const resolver = createResolver([base, createManifest(ALPHA)]);

    expect(idsOf(resolver.resolve([]))).toEqual([BASE]);
    expect(idsOf(resolver.resolve([ALPHA]))).toEqual([BASE, ALPHA]);
  });

  it('installs a glue module exactly while its trigger modules and capabilities are installed', () => {
    const resolver = createResolver([
      base,
      createManifest(ALPHA),
      createManifest(BETA, { provides: [CAPABILITIES.BACKEND_TARGET] }),
      createManifest(GAMMA, { autoInclude: { modules: [ALPHA], capabilities: [CAPABILITIES.BACKEND_TARGET] } }),
    ]);

    expect(idsOf(resolver.resolve([ALPHA]))).not.toContain(GAMMA);
    expect(idsOf(resolver.resolve([ALPHA, BETA]))).toContain(GAMMA);
    // A recorded glue module whose trigger is gone is dropped instead of kept.
    expect(idsOf(resolver.resolve([ALPHA, GAMMA]))).not.toContain(GAMMA);
  });

  it('lets glue modules trigger further glue modules and pull in their requirements', () => {
    const resolver = createResolver([
      base,
      createManifest(ALPHA),
      createManifest(BETA, { autoInclude: { modules: [ALPHA] }, requires: [DELTA] }),
      createManifest(GAMMA, { autoInclude: { modules: [BETA] } }),
      createManifest(DELTA),
    ]);

    expect(idsOf(resolver.resolve([ALPHA]))).toEqual(expect.arrayContaining([BETA, GAMMA, DELTA]));
  });

  it('adds required modules transitively and reports them as added', () => {
    const resolver = createResolver([
      base,
      createManifest(ALPHA, { requires: [BETA] }),
      createManifest(BETA, { requires: [GAMMA] }),
      createManifest(GAMMA),
    ]);

    const result = resolver.resolve([ALPHA]);

    expect(idsOf(result)).toEqual([BASE, GAMMA, BETA, ALPHA]);
    expect(result.addedIds).toEqual([BETA, GAMMA]);
  });

  it('orders independent modules by category, then id', () => {
    const resolver = createResolver([
      base,
      createManifest(ALPHA, { category: MODULE_CATEGORIES.QUALITY }),
      createManifest(BETA, { category: MODULE_CATEGORIES.BACKEND }),
      createManifest(GAMMA, { category: MODULE_CATEGORIES.BACKEND }),
    ]);

    expect(idsOf(resolver.resolve([ALPHA, GAMMA, BETA]))).toEqual([BASE, BETA, GAMMA, ALPHA]);
  });

  it('places capability providers before the modules that need them', () => {
    const resolver = createResolver([
      base,
      createManifest(ALPHA, {
        category: MODULE_CATEGORIES.BASE,
        requiresCapabilities: [CAPABILITIES.BACKEND_TARGET],
      }),
      createManifest(BETA, { category: MODULE_CATEGORIES.FEATURE, provides: [CAPABILITIES.BACKEND_TARGET] }),
    ]);

    expect(idsOf(resolver.resolve([ALPHA, BETA]))).toEqual([BASE, BETA, ALPHA]);
  });

  it('rejects conflicting modules, including conflicts declared by only one side', () => {
    const resolver = createResolver([base, createManifest(ALPHA, { conflicts: [BETA] }), createManifest(BETA)]);

    expect(() => resolver.resolve([BETA, ALPHA])).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.MODULE_CONFLICT,
        message: expect.stringContaining('"alpha" conflicts with "beta"'),
      }),
    );
  });

  it('rejects a conflict pulled in through a requirement', () => {
    const resolver = createResolver([
      base,
      createManifest(ALPHA, { requires: [BETA] }),
      createManifest(BETA),
      createManifest(GAMMA, { conflicts: [BETA] }),
    ]);

    expect(() => resolver.resolve([ALPHA, GAMMA])).toThrow(
      expect.objectContaining({ code: GENERATOR_ERROR_CODES.MODULE_CONFLICT }),
    );
  });

  it('rejects two providers of an exclusive capability', () => {
    const resolver = createResolver([
      base,
      createManifest(ALPHA, { provides: [CAPABILITIES.BACKEND_TARGET] }),
      createManifest(BETA, { provides: [CAPABILITIES.BACKEND_TARGET] }),
    ]);

    expect(() => resolver.resolve([ALPHA, BETA])).toThrow(
      expect.objectContaining({ code: GENERATOR_ERROR_CODES.CAPABILITY_CONFLICT }),
    );
  });

  it('names the modules that could satisfy a missing capability', () => {
    const resolver = createResolver([
      base,
      createManifest(ALPHA, { requiresCapabilities: [CAPABILITIES.DATABASE] }),
      createManifest(BETA, { provides: [CAPABILITIES.DATABASE] }),
      createManifest(GAMMA, { provides: [CAPABILITIES.DATABASE] }),
    ]);

    expect(() => resolver.resolve([ALPHA])).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.MISSING_CAPABILITY,
        message: expect.stringContaining('Add one of: "beta", "gamma"'),
      }),
    );
    expect(idsOf(resolver.resolve([ALPHA, GAMMA]))).toEqual([BASE, GAMMA, ALPHA]);
  });

  it('reports requirement cycles', () => {
    const resolver = createResolver([
      base,
      createManifest(ALPHA, { requires: [BETA] }),
      createManifest(BETA, { requires: [ALPHA] }),
    ]);

    expect(() => resolver.resolve([ALPHA])).toThrow(
      expect.objectContaining({ code: GENERATOR_ERROR_CODES.DEPENDENCY_CYCLE }),
    );
  });

  it('rejects modules that are not registered', () => {
    const resolver = createResolver([base]);

    expect(() => resolver.resolve([DELTA])).toThrow(
      expect.objectContaining({ code: GENERATOR_ERROR_CODES.UNKNOWN_MODULE }),
    );
  });

  it('rejects manifests that fail validation or reference unregistered modules', () => {
    const createRegistry = (manifests: iModuleManifestInput[]) =>
      createGeneratorContainer({ sourceRoot: '/unused', manifests }).resolve(ModuleRegistry);

    expect(() => createRegistry([base, createManifest(ALPHA, { files: [{ source: '../outside' }] })])).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.INVALID_MANIFEST,
        message: expect.stringContaining('files.0.source'),
      }),
    );
    expect(() => createRegistry([base, createManifest(ALPHA, { requires: [DELTA] })])).toThrow(
      expect.objectContaining({ code: GENERATOR_ERROR_CODES.UNKNOWN_MODULE }),
    );
  });
});
