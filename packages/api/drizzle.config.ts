import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Every app of the project reads the root `.env`; drizzle-kit runs from this package.
config({ path: '../../.env', quiet: true });

export default defineConfig({
  out: './src/db/migrations',
  // Each module keeps its tables in `<feature>.schema.ts` files.
  schema: './src/features/**/*.schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? 'postgresql://postgres:postgres@localhost:5432/startername',
  },
});
