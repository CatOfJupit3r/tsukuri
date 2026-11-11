import { createGeneratorContainer } from '#~/di/container';
import { ModuleRegistry } from '#~/engine/modules/module-registry';
import { ModuleResolver } from '#~/engine/modules/module-resolver';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import { MODULE_IDS, moduleIdSchema } from '#~/enums/module-ids.enums';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';
import { planModuleMatrix } from './module-matrix';

const GENERATOR = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT });
const REGISTRY = GENERATOR.resolve(ModuleRegistry);
const RESOLVER = GENERATOR.resolve(ModuleResolver);

function matrixSelections() {
  return planModuleMatrix(REGISTRY, RESOLVER).map(({ modules }) => moduleIdSchema.array().parse(JSON.parse(modules)));
}

describe('generated project matrix', () => {
  it('covers headless and web projects and excludes database choices their backends cannot provide', () => {
    const selections = matrixSelections();
    const moduleSets = selections.map((selection) => new Set(selection));

    expect(moduleSets).toContainEqual(new Set());
    expect(moduleSets).toContainEqual(new Set([MODULE_IDS.NODE_HONO, MODULE_IDS.SQLITE, MODULE_IDS.BETTER_AUTH]));
    expect(moduleSets).toContainEqual(
      new Set([MODULE_IDS.CLOUDFLARE_WORKER, MODULE_IDS.WEB_SPA, MODULE_IDS.D1, MODULE_IDS.BETTER_AUTH]),
    );
    expect(
      selections.some(
        (selection) => selection.includes(MODULE_IDS.CLOUDFLARE_WORKER) && selection.includes(MODULE_IDS.SQLITE),
      ),
    ).toBe(false);
  });

  it('checks each resolved project once when an explicit choice repeats an implied dependency', () => {
    const startOnly = matrixSelections().filter(
      (selection) =>
        selection.includes(MODULE_IDS.TANSTACK_START) &&
        selection.every((moduleId) => moduleId === MODULE_IDS.TANSTACK_START || moduleId === MODULE_IDS.WEB_SSR),
    );

    expect(startOnly).toHaveLength(1);
  });

  it('exercises the fullstack preset and its individual add-ons', () => {
    const moduleSets = matrixSelections().map((selection) => new Set(selection));
    const fullstackCore = [MODULE_IDS.NODE_HONO, MODULE_IDS.WEB_SSR, MODULE_IDS.POSTGRES, MODULE_IDS.BETTER_AUTH];

    expect(moduleSets).toContainEqual(new Set([...fullstackCore, MODULE_IDS.VALKEY, MODULE_IDS.E2E]));
    expect(moduleSets).toContainEqual(new Set([...fullstackCore, MODULE_IDS.VALKEY]));
    expect(moduleSets).toContainEqual(new Set([...fullstackCore, MODULE_IDS.E2E]));
    expect(moduleSets).toContainEqual(new Set([...fullstackCore, MODULE_IDS.EXAMPLE_DOMAIN]));
  });

  it('requires a backend for Postgres so generation can supply its runtime service', () => {
    expect(() => RESOLVER.resolve([MODULE_IDS.POSTGRES])).toThrow(
      expect.objectContaining({ code: GENERATOR_ERROR_CODES.MISSING_CAPABILITY }),
    );
  });
});
