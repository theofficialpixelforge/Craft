const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'craft.db');

let db;
let SQL;
let saveTimer;

async function initDB() {
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id          TEXT PRIMARY KEY,
      parent_id   TEXT,
      title       TEXT NOT NULL DEFAULT 'Untitled',
      emoji       TEXT,
      cover_url   TEXT,
      position    REAL NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_deleted  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS blocks (
      id            TEXT PRIMARY KEY,
      document_id   TEXT NOT NULL,
      type          TEXT NOT NULL,
      content       TEXT NOT NULL DEFAULT '[]',
      indent        INTEGER NOT NULL DEFAULT 0,
      position      REAL NOT NULL DEFAULT 0,
      checked       INTEGER,
      language      TEXT,
      callout_icon  TEXT,
      image_url     TEXT,
      image_caption TEXT,
      linked_doc_id TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrations: additive columns for existing databases
  try { db.run(`ALTER TABLE blocks ADD COLUMN linked_doc_id TEXT`); } catch {}
  try { db.run(`ALTER TABLE blocks ADD COLUMN table_data TEXT`);    } catch {}
  try { db.run(`ALTER TABLE blocks ADD COLUMN columns_data TEXT`);  } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS backlinks (
      source_doc_id TEXT NOT NULL,
      target_doc_id TEXT NOT NULL,
      PRIMARY KEY (source_doc_id, target_doc_id)
    );
  `);

  save();
  return db;
}

function save() {
  if (!db) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error('DB save error:', e);
    }
  }, 200);
}

// better-sqlite3-compatible API wrapper
function prepare(sql) {
  return {
    _sql: sql,
    run(...args) {
      const params = args.flat();
      db.run(sql, params);
      save();
    },
    get(...args) {
      const params = args.flat();
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        if (stmt.step()) {
          return stmt.getAsObject();
        }
        return undefined;
      } finally {
        stmt.free();
      }
    },
    all(...args) {
      const params = args.flat();
      const stmt = db.prepare(sql);
      const rows = [];
      try {
        stmt.bind(params);
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
      } finally {
        stmt.free();
      }
      return rows;
    },
  };
}

function transaction(fn) {
  return () => {
    db.run('BEGIN');
    try {
      fn();
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }
    save();
  };
}

function exec(sql) {
  db.run(sql);
  save();
}

function getDB() {
  return { prepare, transaction, exec };
}

module.exports = { initDB, getDB };
