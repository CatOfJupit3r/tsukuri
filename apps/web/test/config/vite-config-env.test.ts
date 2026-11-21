// @vitest-environment node
import path from 'node:path';
import { loadConfigFromFile } from 'vite';

const WEB_APP_DIRECTORY = path.resolve(import.meta.dirname, '../..');
const SERVER_ONLY_VARIABLES = ['INTERNAL_RENDER_SECRET', 'VITE_SERVER_URL', 'BETTER_AUTH_SECRET'];

async function loadBuildConfig(environment: Record<string, string>) {
  const original = { ...process.env };
  for (const name of SERVER_ONLY_VARIABLES) delete process.env[name];
  Object.assign(process.env, environment);
  try {
    return await loadConfigFromFile({ command: 'build', mode: 'production' }, undefined, WEB_APP_DIRECTORY);
  } finally {
    for (const name of Object.keys(process.env)) if (!(name in original)) delete process.env[name];
    Object.assign(process.env, original);
  }
}

describe('vite.config environment', () => {
  it('loads for a build that has none of the server secrets', async () => {
    await expect(loadBuildConfig({})).resolves.not.toBeNull();
  });

  it('refuses a build whose VITE_PORT is not a port', async () => {
    await expect(loadBuildConfig({ VITE_PORT: 'not-a-port' })).rejects.toThrow(/VITE_PORT/);
  });
});
