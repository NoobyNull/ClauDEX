import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import { getDbPath } from '../shared/config.js';
import { createLogger } from '../shared/logger.js';
import { initializeSchema, initializeVectorTable } from './schema.js';

const log = createLogger('database');

// In esbuild CJS output, __filename is available natively.
declare const __filename: string;
const _require = createRequire(`file://${__filename}`);

let dbInstance: Database.Database | null = null;
let vectorsAvailable = false;

function loadSqliteVec(db: Database.Database): void {
  try {
    const sqliteVec = _require('sqlite-vec');
    sqliteVec.load(db);
    log.info('sqlite-vec extension loaded');
  } catch {
    log.warn('sqlite-vec extension not available — vector search disabled');
  }
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = getDbPath();
  log.info('Opening database', { path: dbPath });

  dbInstance = new Database(dbPath);

  // Enable WAL mode for crash resilience and concurrent reads
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');

  // Try to load sqlite-vec extension
  loadSqliteVec(dbInstance);

  // Initialize schema
  initializeSchema(dbInstance);

  // Try vector table
  vectorsAvailable = initializeVectorTable(dbInstance);

  return dbInstance;
}

export function isVectorsAvailable(): boolean {
  return vectorsAvailable;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    log.info('Database closed');
  }
}

export function generateId(prefix: string = 'sch'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${ts}_${rand}`;
}
