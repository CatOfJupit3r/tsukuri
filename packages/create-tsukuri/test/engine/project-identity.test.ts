import { getProjectNameProblem } from '@~/engine/project-identity';

describe('project names', () => {
  it.each(['acme', 'my-app', 'my.app_2', 'a1'])('accepts "%s"', (name) => {
    expect(getProjectNameProblem(name)).toBeNull();
  });

  it.each(['', 'Acme', 'my app', '-acme', '.acme', '_acme', 'acme-', 'my--app', 'my.-app', 'node_modules'])(
    'rejects "%s"',
    (name) => {
      expect(getProjectNameProblem(name)).not.toBeNull();
    },
  );
});
