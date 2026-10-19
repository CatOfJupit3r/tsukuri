import { PRESETS } from '#~/cli/presets';
import { createGeneratorContainer } from '#~/di/container';
import { ModuleResolver } from '#~/engine/module-resolver';
import { presetIdsEnumwaii } from '#~/enums/preset-ids.enums';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

describe('presets', () => {
  const resolver = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT }).resolve(ModuleResolver);

  it.each(presetIdsEnumwaii.values)('%s resolves to a valid module set', (presetId) => {
    const moduleIds = [...PRESETS.get(presetId).answers.values()].flat();

    expect(() => resolver.resolve(moduleIds)).not.toThrow();
  });
});
