import 'reflect-metadata';
import { container } from 'tsyringe';

import { DatabaseMigrator } from '#~/features/database/database-migrator';

// `db:migrate` runs this from the API package directory.
await container.resolve(DatabaseMigrator).migrate(process.cwd());
