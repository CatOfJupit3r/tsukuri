import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/server.ts',
  format: 'esm',
  platform: 'node',
  sourcemap: true,
  dts: false,
});
