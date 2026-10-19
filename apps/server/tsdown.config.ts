import { defineConfig } from 'tsdown';

import { withWorkspaceSourceCondition } from '@startername/workspace-source/conditions';

export default defineConfig({
  entry: 'src/server.ts',
  format: 'esm',
  platform: 'node',
  sourcemap: true,
  dts: false,
  noExternal: ['@startername/**'],
  inputOptions: {
    resolve: {
      conditionNames: withWorkspaceSourceCondition(['import', 'node', 'default']),
    },
  },
});
