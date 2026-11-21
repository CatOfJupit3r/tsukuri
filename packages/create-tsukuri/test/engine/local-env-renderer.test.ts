import { LocalEnvRenderer } from '#~/engine/local-env-renderer';

const EXAMPLE = [
  '# apps/web',
  'INTERNAL_RENDER_SECRET=placeholder',
  '# packages/api',
  'BETTER_AUTH_SECRET=placeholder',
  'INTERNAL_RENDER_SECRET=placeholder',
  'PORT=5050',
].join('\n');

function valuesOf(content: string, variable: string) {
  return [...content.matchAll(new RegExp(`^${variable}=(.*)$`, 'gm'))].map((match) => match[1]);
}

describe('LocalEnvRenderer', () => {
  const rendered = new LocalEnvRenderer().render(EXAMPLE);

  it('writes one random value on every line of a secret that several workspaces list', () => {
    const values = valuesOf(rendered, 'INTERNAL_RENDER_SECRET');

    expect(values).toHaveLength(2);
    expect(values[0]).toBe(values[1]);
    expect(values[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives each secret its own value and leaves other variables alone', () => {
    expect(valuesOf(rendered, 'BETTER_AUTH_SECRET')[0]).not.toBe(valuesOf(rendered, 'INTERNAL_RENDER_SECRET')[0]);
    expect(valuesOf(rendered, 'PORT')).toEqual(['5050']);
  });
});
