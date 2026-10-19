import { runCommand } from '../helpers/run-command';
import { REPOSITORY_ROOT } from '../helpers/temp-dir';

const VARIANT_TIMEOUT_MS = 120_000;

/**
 * The SPA files replace the SSR entry points in a generated project. Here they sit in
 * apps/web/variants/spa, so this checks them against the shared web sources the way a project would.
 */
describe('web rendering variants', () => {
  it(
    'type-checks the SPA entry points against the shared web app',
    async () => {
      const result = await runCommand(
        'pnpm --filter=web run generate:routes && pnpm --filter=web exec tsgo --noEmit -p variants/spa/tsconfig.json',
        REPOSITORY_ROOT,
      );

      expect(result.exitCode, result.output).toBe(0);
    },
    VARIANT_TIMEOUT_MS,
  );
});
