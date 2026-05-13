import { drizzle } from 'drizzle-orm/d1';

import * as schema from './schema';

export function createD1Db(binding: D1Database) {
  return drizzle(binding, { schema });
}

export type AppDatabase = ReturnType<typeof createD1Db>;
