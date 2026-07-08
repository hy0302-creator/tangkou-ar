const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '📦',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', '+8 hours'))
);

CREATE TABLE IF NOT EXISTS ar_contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  category_id INTEGER,
  target_image_path TEXT DEFAULT '',
  target_mind_path TEXT DEFAULT '',
  model_3d_path TEXT DEFAULT '',
  model_scale TEXT DEFAULT '{"x":1,"y":1,"z":1}',
  model_position TEXT DEFAULT '{"x":0,"y":0,"z":0}',
  info_html TEXT DEFAULT '',
  audio_path TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  thumbnail_path TEXT DEFAULT '',
  qr_code_path TEXT DEFAULT '',
  is_published INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', '+8 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now', '+8 hours'))
);
`;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Ensure data directory exists
  if (!fs.existsSync(config.DATA_DIR)) {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(config.DB_PATH)) {
    const fileBuffer = fs.readFileSync(config.DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize schema
  db.run('PRAGMA foreign_keys = ON;');
  const statements = SCHEMA.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    db.run(stmt + ';');
  }

  // Save to file initially
  saveDb();

  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.DB_PATH, buffer);
  }
}

function run(sql, params = []) {
  try {
    db.run(sql, params);
    saveDb();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function get(sql, params = []) {
  let stmt = null;
  try {
    stmt = db.prepare(sql);
    stmt.bind(params);
    const hasRow = stmt.step();
    return hasRow ? stmt.getAsObject() : null;
  } catch (err) {
    console.error('[DB] get() error:', err.message, 'SQL:', sql.substring(0, 100));
    return null;
  } finally {
    if (stmt) stmt.free();
  }
}

function all(sql, params = []) {
  let stmt = null;
  try {
    stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    return results;
  } catch (err) {
    console.error('[DB] all() error:', err.message, 'SQL:', sql.substring(0, 100));
    return [];
  } finally {
    if (stmt) stmt.free();
  }
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, saveDb, run, get, all, closeDb };
