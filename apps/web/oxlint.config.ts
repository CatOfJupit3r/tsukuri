import { createOxlintConfig } from '@startername/lint-config/oxlint';

export default createOxlintConfig({ isReact: true, ignorePatterns: ['src/routeTree.gen.ts'] });
