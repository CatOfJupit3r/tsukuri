import { createGeneratorContainer } from '#~/di/container';
import { RepositoryConnectionPoints } from '#~/sync/repository-connection-points';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

describe('repository connection points', () => {
  it('match what starter.json generates (run `pnpm run sync` after changing modules)', async () => {
    const plan = await createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT })
      .resolve(RepositoryConnectionPoints)
      .plan(REPOSITORY_ROOT);

    expect(plan.writes.map((file) => file.path)).toEqual([]);
    expect(plan.deletions).toEqual([]);
  });
});
