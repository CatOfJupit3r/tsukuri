import { mergeThreeWay } from '#~/engine/three-way-merge';

describe('mergeThreeWay', () => {
  it('takes the generator change when the user did not touch the value', () => {
    expect(mergeThreeWay({ a: 1 }, { a: 1 }, { a: 1, b: 2 })).toEqual({ value: { a: 1, b: 2 }, conflicts: [] });
  });

  it('keeps user additions next to generator additions', () => {
    const base = { scripts: { dev: 'vite' }, dependencies: { zod: '4' } };
    const ours = { scripts: { dev: 'vite', 'my-script': 'echo' }, dependencies: { zod: '4', lodash: '4' } };
    const theirs = { scripts: { dev: 'vite', db: 'drizzle-kit' }, dependencies: { zod: '4', pg: '8' } };

    expect(mergeThreeWay(base, ours, theirs)).toEqual({
      value: {
        scripts: { dev: 'vite', db: 'drizzle-kit', 'my-script': 'echo' },
        dependencies: { zod: '4', pg: '8', lodash: '4' },
      },
      conflicts: [],
    });
  });

  it('removes what the generator removed unless the user changed it', () => {
    expect(mergeThreeWay({ a: 1, b: 2 }, { a: 1, b: 2 }, { a: 1 }).value).toEqual({ a: 1 });
    expect(mergeThreeWay({ a: 1, b: 2 }, { a: 1, b: 3 }, { a: 1 })).toEqual({
      value: { a: 1, b: 3 },
      conflicts: ['b'],
    });
  });

  it('merges scalar arrays as sets', () => {
    expect(mergeThreeWay(['packages/*'], ['packages/*', 'tools/*'], ['packages/*', 'apps/*']).value).toEqual([
      'packages/*',
      'tools/*',
      'apps/*',
    ]);
    expect(mergeThreeWay(['a', 'b'], ['a', 'b', 'c'], ['a']).value).toEqual(['a', 'c']);
  });

  it('keeps the user value and reports the path when both sides changed it differently', () => {
    expect(
      mergeThreeWay({ engines: { node: '24' } }, { engines: { node: '25' } }, { engines: { node: '26' } }),
    ).toEqual({
      value: { engines: { node: '25' } },
      conflicts: ['engines.node'],
    });
  });
});
