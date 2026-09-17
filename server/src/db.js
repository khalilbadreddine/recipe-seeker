/**
 * SQLite connection + schema for The Recipe Seeker API.
 *
 * - DB file lives at server/data/app.db (gitignored — see repo .gitignore).
 * - `subscribers`: email signups from the landing page capture form.
 * - `usda_cache`: on-disk cache of USDA FoodData Central responses so the
 *   build never depends on the network and stays under the API rate limit.
 *
 * better-sqlite3 is synchronous by design; the prepared statements below
 * are reused by callers (index.js, usda.js).
 */
'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usda_cache (
  key        TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
`);

module.exports = db;
