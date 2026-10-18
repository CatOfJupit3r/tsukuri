import { config } from 'dotenv';
import path from 'node:path';

/**
 * The API reads its variables from `process.env`; in development they come from the root `.env`
 * (the dev server runs in apps/web). Deployments pass them in directly.
 */
if (process.env.NODE_ENV !== 'production') config({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });
