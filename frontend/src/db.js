import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let oo1Db = null;
let storageMode = 'unknown';
let storageFallbackReason = null;

export function getStorageMode() {
  return { mode: storageMode, reason: storageFallbackReason };
}

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

  // SharedArrayBuffer가 비활성인 환경(iOS standalone PWA 등)에서도 동작하는 SAH-Pool VFS를 사용한다.
  // 표준 OPFS VFS는 worker1이 SAB 필요로 install 단계를 스킵해 "no such vfs: opfs" 에러로 떨어진다.
  try {
    const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
      name: 'opfs-sahpool',
      initialCapacity: 6,
    });
    oo1Db = new poolUtil.OpfsSAHPoolDb('/carlog.sqlite3');
    storageMode = 'opfs-sahpool';
  } catch (e) {
    storageFallbackReason = e?.message ?? String(e);
    console.error(new Error(`OPFS-SAHPool 초기화 실패, 인메모리 DB로 폴백: ${storageFallbackReason}`));
    oo1Db = new sqlite3.oo1.DB(':memory:');
    storageMode = 'memory';
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
