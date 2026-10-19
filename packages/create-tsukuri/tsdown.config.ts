import { defineConfig } from 'tsdown';

/** The published CLI; `bundle:sources` copies its module sources next to it. */
export default defineConfig({
  entry: 'src/cli/published-main.ts',
  format: 'esm',
  platform: 'node',
  dts: false,
  // The npm bin runs the file directly; set here because formatters strip a shebang from the source.
  banner: '#!/usr/bin/env node',
});
