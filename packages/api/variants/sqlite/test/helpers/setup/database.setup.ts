import { afterEach } from 'vitest';

import { clearTestSqliteTables, initializeTestSqlite } from '../sqlite-memory';

await initializeTestSqlite();

afterEach(() => {
  clearTestSqliteTables();
});
