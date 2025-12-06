import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { join } from 'path';
import * as schema from './schema';

const dbPath = join(process.cwd(), 'sqlite.db');
const client = createClient({
  url: `file:${dbPath}`
});

export const db = drizzle(client, { schema });
