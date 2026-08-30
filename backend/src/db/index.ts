import { drizzle } from 'drizzle-orm/sqlite3';
import Database from 'sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);

export * from './schema';
