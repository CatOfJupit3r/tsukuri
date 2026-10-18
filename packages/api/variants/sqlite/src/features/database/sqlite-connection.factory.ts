import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { singleton } from 'tsyringe';

import { IN_MEMORY_DATABASE_PATH } from './database.constants';

/** Opens `node:sqlite` databases with the pragmas every connection of the API relies on. */
@singleton()
export class SqliteConnectionFactory {
  public async open(databasePath: string) {
    if (databasePath !== IN_MEMORY_DATABASE_PATH) {
      await mkdir(path.dirname(path.resolve(databasePath)), { recursive: true });
    }

    const database = new DatabaseSync(databasePath);
    database.exec('PRAGMA journal_mode = WAL');
    database.exec('PRAGMA foreign_keys = ON');
    database.exec('PRAGMA busy_timeout = 5000');
    return database;
  }
}
