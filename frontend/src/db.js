import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';

let promiser = null;
let dbId = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS fuel (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT    NOT NULL,
    type        TEXT    NOT NULL DEFAULT '가득주유',
    amount      INTEGER NOT NULL,
    unit_price  INTEGER,
    liters      REAL,
    odometer    INTEGER NOT NULL,
    interval_km INTEGER,
    fuel_economy REAL,
    location    TEXT,
    memo        TEXT,
    created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS maintenance (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    item       TEXT    NOT NULL,
    amount     INTEGER NOT NULL DEFAULT 0,
    odometer   INTEGER NOT NULL,
    location   TEXT,
    memo       TEXT,
    created_at TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('car_birth', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('car_type',  '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('car_brand', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('car_model', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('car_plate', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('car_fuel',  '');

  CREATE TABLE IF NOT EXISTS other (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    item       TEXT    NOT NULL,
    amount     INTEGER NOT NULL DEFAULT 0,
    odometer   INTEGER,
    location   TEXT,
    memo       TEXT,
    created_at TEXT    DEFAULT (datetime('now', 'localtime'))
  );
`;

export async function initDB() {
  promiser = await new Promise((resolve, reject) => {
    const p = sqlite3Worker1Promiser({
      onready: () => resolve(p),
      onerror: (e) => reject(new Error(e.result?.message ?? 'SQLite worker 초기화 실패')),
    });
  });

  try {
    const res = await promiser('open', { filename: 'file:carlog.sqlite3?vfs=opfs' });
    dbId = res.dbId;
  } catch (e) {
    console.warn('OPFS 초기화 실패, 인메모리 DB로 폴백합니다 (데이터가 유지되지 않음):', e);
    const res = await promiser('open', { filename: ':memory:' });
    dbId = res.dbId;
  }

  await promiser('exec', { dbId, sql: SCHEMA });
}

export function getDB() {
  if (!promiser || dbId == null) throw new Error('DB가 초기화되지 않았습니다. initDB()를 먼저 호출하세요.');

  return {
    query: async (sql, params = []) => {
      const res = await promiser('exec', {
        dbId, sql,
        bind: params.length > 0 ? params : undefined,
        rowMode: 'object',
        returnValue: 'resultRows',
      });
      return { values: res.result.resultRows ?? [] };
    },

    run: async (sql, params = []) => {
      await promiser('exec', {
        dbId, sql,
        bind: params.length > 0 ? params : undefined,
      });
      const meta = await promiser('exec', {
        dbId,
        sql: 'SELECT last_insert_rowid() AS lastId',
        rowMode: 'object',
        returnValue: 'resultRows',
      });
      return { changes: { lastId: meta.result.resultRows[0]?.lastId ?? null } };
    },

    execute: async (sql) => promiser('exec', { dbId, sql }),
    beginTransaction:    async () => promiser('exec', { dbId, sql: 'BEGIN' }),
    commitTransaction:   async () => promiser('exec', { dbId, sql: 'COMMIT' }),
    rollbackTransaction: async () => promiser('exec', { dbId, sql: 'ROLLBACK' }),
  };
}
