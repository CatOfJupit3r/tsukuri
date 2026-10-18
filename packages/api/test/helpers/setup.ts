import { startApi } from '#~/start-api';

import './matchers';

// Runs after every module's `setup/*.setup.ts` (in-memory database, fast password hashing, ...).
await startApi();
