import swc from 'unplugin-swc';

/**
 * Legacy decorators with decorator metadata, which tsyringe needs to read constructor
 * parameter types. Matches `tsconfig.decorators.json`, which `@swc-node/register` (dev) reads.
 */
export const SWC_DECORATOR_OPTIONS = {
  jsc: {
    parser: { syntax: 'typescript', decorators: true },
    transform: { legacyDecorator: true, decoratorMetadata: true },
    keepClassNames: true,
  },
};

/** Vitest/Vite plugin that compiles TypeScript with SWC using the shared decorator settings. */
export const createSwcPlugin = (tsconfigFile = './tsconfig.json') =>
  swc.vite({ tsconfigFile, ...SWC_DECORATOR_OPTIONS });
