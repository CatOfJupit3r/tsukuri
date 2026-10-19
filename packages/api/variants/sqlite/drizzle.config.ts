import { defineConfig } from 'drizzle-kit';

import { MIGRATIONS_FOLDER } from './src/features/database/database.constants';

export default defineConfig({
  out: `./${MIGRATIONS_FOLDER}`,
  // Each module keeps its tables in `<feature>.schema.ts` files.
  schema: './src/features/**/*.schema.ts',
  dialect: 'sqlite',
});
