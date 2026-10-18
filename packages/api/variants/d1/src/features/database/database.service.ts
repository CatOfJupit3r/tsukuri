import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { inject, singleton } from 'tsyringe';

import { generatedDatabaseSchema } from '#~/generated/database-schema';

import { D1_DATABASE_TOKEN } from './d1-database.token';

@singleton()
export class DatabaseService {
  private db: DrizzleD1Database<typeof generatedDatabaseSchema> | null = null;

  constructor(@inject(D1_DATABASE_TOKEN) private readonly d1Database: D1Database) {}

  /** The D1 binding is ready as soon as the Worker receives it. */
  public async connect() {
    this.getDb();
  }

  public getDb() {
    this.db ??= drizzle(this.d1Database, { schema: generatedDatabaseSchema });
    return this.db;
  }

  public async disconnect() {
    this.db = null;
  }
}
