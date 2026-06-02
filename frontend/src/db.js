import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let oo1Db = null;

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
  const sqlite3 = await sqlite3InitModule({
    print: console.log,
    printErr: console.error,
  });

  // iOS standalone PWA는 OPFS API를 통째로 차단하므로 localStorage 기반 kvvfs를 사용한다. 한도 5MB.
  try {
    oo1Db = new sqlite3.oo1.JsStorageDb('local');
  } catch (e) {
    console.warn('kvvfs(local) 초기화 실패, 인메모리 DB로 폴백 (데이터가 유지되지 않음):', e);
    oo1Db = new sqlite3.oo1.DB(':memory:');
  }

  oo1Db.exec(SCHEMA);
}

export function getDB() {
  if (!oo1Db) throw new Error('DB가 초기화되지 않았습니다. initDB()를 먼저 호출하세요.');

  return {
    query: async (sql, params = []) => {
      const values = oo1Db.exec({
        sql,
        bind: params.length > 0 ? params : undefined,
        rowMode: 'object',
        returnValue: 'resultRows',
      });
      return { values };
    },

    run: async (sql, params = []) => {
      oo1Db.exec({
        sql,
        bind: params.length > 0 ? params : undefined,
      });
      const lastId = oo1Db.selectValue('SELECT last_insert_rowid()') ?? null;
      return { changes: { lastId } };
    },

    execute: async (sql) => { oo1Db.exec(sql); },
    beginTransaction:    async () => { oo1Db.exec('BEGIN'); },
    commitTransaction:   async () => { oo1Db.exec('COMMIT'); },
    rollbackTransaction: async () => { oo1Db.exec('ROLLBACK'); },
  };
}
