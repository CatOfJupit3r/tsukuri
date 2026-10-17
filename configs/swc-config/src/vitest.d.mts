import type { Plugin } from 'vite';

export declare const SWC_DECORATOR_OPTIONS: {
  jsc: {
    parser: { syntax: 'typescript'; decorators: true };
    transform: { legacyDecorator: true; decoratorMetadata: true };
    keepClassNames: true;
  };
};

export declare const createSwcPlugin: (tsconfigFile?: string) => Plugin;
