import { defineConfig } from 'tsdown';

/** The published CLI; `bundle:sources` copies its module sources next to it. */
export default defineConfig({
  entry: 'src/cli/published-main.ts',
  format: 'esm',
  platform: 'node',
  dts: false,
});
