import { defineConfig } from '@playwright/test';

import baseConfig from './playwright.config';

const htmlOutputDir = process.env.PLAYWRIGHT_HTML_OUTPUT_DIR;

/** The specs with every run recorded, for demos: `pnpm --filter=e2e exec playwright test -c playwright.video.config.ts`. */
export default defineConfig({
  ...baseConfig,
  reporter: [['list'], ['html', { open: 'never', outputFolder: htmlOutputDir ?? './playwright-report' }]],
  use: {
    ...baseConfig.use,
    video: 'on',
  },
});
