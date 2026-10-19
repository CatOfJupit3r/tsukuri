import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import z from 'zod';

import { withWorkspaceSourceResolve } from '@startername/workspace-source/vite';

import { generatedEnvShape } from './src/generated/env.schema';

/** Every app of the project reads the root `.env`. */
const ENV_DIR = path.resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const processEnv = loadEnv(mode, ENV_DIR);
  const env = z.object(generatedEnvShape).parse(processEnv);
  // Set when the API runs as a separate server; the dev server then forwards `/api` to it.
  const { VITE_SERVER_URL: serverUrl } = processEnv;

  return {
    envDir: ENV_DIR,
    plugins: [
      devtools(),
      tailwindcss(),
      tanstackStart({
        router: {
          quoteStyle: 'single',
          semicolons: true,
        },
      }),
      react({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
    ],
    ...withWorkspaceSourceResolve(),
    server: {
      host: env.VITE_HOST,
      port: env.VITE_PORT,
      proxy: serverUrl
        ? {
            '/api': {
              target: serverUrl,
              changeOrigin: true,
              rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },
  };
});
