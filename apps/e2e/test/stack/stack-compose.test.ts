import path from 'node:path';

import { describeStack } from '#~/stack/claim-stack';
import { buildComposeDocument } from '#~/stack/stack-compose';
import { createStackDefinition } from '#~/stack/stack-definition';
import { PROJECT_ROOT_DIRECTORY } from '#~/stack/stack-paths';

const definition = createStackDefinition({
  projectName: '@acme/App',
  composeServices: [
    {
      name: 'postgres',
      service: {
        image: 'postgres:17',
        container_name: 'acme-postgres',
        ports: ['5432:5432', '127.0.0.1:5433:5433/udp', { target: 8080, published: '8080' }, 9000],
        volumes: ['postgres-data:/var/lib/postgresql/data', './init.sql:/docker-entrypoint-initdb.d/init.sql:ro'],
      },
    },
  ],
  devTasks: [
    { filter: 'server', portVariable: 'SERVER_PORT' },
    { filter: 'web', portVariable: 'VITE_PORT' },
  ],
  exampleEnvironment: { SERVER_PORT: '5050', VITE_PORT: '3030' },
});

describe('a slot stack', () => {
  const stack = describeStack(definition, 2, {});

  it('serves the web app and the apps on the slot ports, in a compose project of its own', () => {
    expect(stack.webBaseUrl).toBe('http://localhost:13032');
    expect(stack.appPorts).toEqual([15052, 13032]);
    expect(stack.composeProjectName).toBe('acme-app-e2e-2');
    expect(stack.environment).toMatchObject({ SERVER_PORT: '15052', VITE_PORT: '13032', E2E_STACK_SLOT: '2' });
  });

  it('runs the dev services on the slot ports, without fixed names or persistent volumes', () => {
    expect(buildComposeDocument(stack).services.postgres).toEqual({
      image: 'postgres:17',
      ports: ['15434:5432', '127.0.0.1:15435:5433/udp', { target: 8080, published: '18082' }, 9000],
      volumes: [`${path.join(PROJECT_ROOT_DIRECTORY, 'init.sql')}:/docker-entrypoint-initdb.d/init.sql:ro`],
    });
  });
});

describe('createStackDefinition', () => {
  it('refuses a dev task whose port .env.example does not set', () => {
    expect(() =>
      createStackDefinition({
        projectName: 'acme',
        composeServices: [],
        devTasks: [{ filter: 'web', portVariable: 'VITE_PORT' }],
        exampleEnvironment: {},
      }),
    ).toThrow(/"web" dev task has no port/);
  });
});
