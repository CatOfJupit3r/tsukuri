import { buildStackEnvironment } from '#~/stack/stack-environment';

const portMap = new Map([
  [3030, 13031],
  [5050, 15051],
  [5432, 15433],
]);

function build(exampleEnvironment: Record<string, string>, baseEnvironment: NodeJS.ProcessEnv = {}) {
  return buildStackEnvironment({
    exampleEnvironment,
    baseEnvironment,
    portMap,
    dataDirectory: 'apps/e2e/.stack/slot-1/data',
  });
}

describe('buildStackEnvironment', () => {
  it('moves every dev port to the slot port, in plain values, URLs and lists', () => {
    expect(
      build({
        SERVER_PORT: '5050',
        POSTGRES_URL: 'postgresql://postgres:postgres@localhost:5432/app',
        AUTH_TRUSTED_ORIGINS: 'http://localhost:3030,http://127.0.0.1:3030/',
        VALKEY_PORT: '6379',
        RETRY_DELAY: '15050',
      }),
    ).toEqual({
      SERVER_PORT: '15051',
      POSTGRES_URL: 'postgresql://postgres:postgres@localhost:15433/app',
      AUTH_TRUSTED_ORIGINS: 'http://localhost:13031,http://127.0.0.1:13031/',
      VALKEY_PORT: '6379',
      RETRY_DELAY: '15050',
    });
  });

  it('moves local data into the slot data folder', () => {
    expect(build({ SQLITE_PATH: '../../data/app.db' }).SQLITE_PATH).toBe('../../apps/e2e/.stack/slot-1/data/app.db');
  });

  it('lets the starting environment fill in values, but never the ones the slot moved', () => {
    const environment = build(
      { SERVER_PORT: '5050', AUTH_SECRET: 'example-secret' },
      { SERVER_PORT: '5050', AUTH_SECRET: 'developer-secret', PATH: '/usr/bin' },
    );

    expect(environment).toMatchObject({ SERVER_PORT: '15051', AUTH_SECRET: 'developer-secret', PATH: '/usr/bin' });
  });
});
