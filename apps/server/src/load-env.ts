import { config } from 'dotenv';
import path from 'node:path';

/** Every app of the project reads the root `.env`; variables already set in the environment win. */
const ROOT_ENV_FILE = path.resolve(import.meta.dirname, '../../../.env');

if (process.env.NODE_ENV !== 'production') config({ path: ROOT_ENV_FILE, quiet: true });
