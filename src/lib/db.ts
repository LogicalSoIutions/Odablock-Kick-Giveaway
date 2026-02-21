import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "giveaway.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS auth_user (
    kick_user_id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kick_user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    keyword TEXT NOT NULL,
    won_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate: if old schema had `id` column as PK, recreate
try {
  const info = db.prepare("PRAGMA table_info(auth_user)").all() as Array<{ name: string }>;
  const hasIdColumn = info.some((col) => col.name === "id");
  if (hasIdColumn) {
    db.exec(`
      DROP TABLE auth_user;
      CREATE TABLE auth_user (
        kick_user_id INTEGER PRIMARY KEY,
        username TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
} catch {
  // Table is fine
}

export interface AuthUser {
  kick_user_id: number;
  username: string;
  access_token: string;
  refresh_token: string;
  created_at: string;
}

export interface Winner {
  id: number;
  kick_user_id: number;
  username: string;
  keyword: string;
  won_at: string;
}

export function getAuthUser(kickUserId: number): AuthUser | undefined {
  return db
    .prepare("SELECT * FROM auth_user WHERE kick_user_id = ?")
    .get(kickUserId) as AuthUser | undefined;
}

export function getAnyAuthUser(): AuthUser | undefined {
  return db.prepare("SELECT * FROM auth_user LIMIT 1").get() as
    | AuthUser
    | undefined;
}

export function upsertAuthUser(
  kickUserId: number,
  username: string,
  accessToken: string,
  refreshToken: string
): void {
  db.prepare(
    `INSERT INTO auth_user (kick_user_id, username, access_token, refresh_token)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(kick_user_id) DO UPDATE SET
       username = excluded.username,
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       created_at = CURRENT_TIMESTAMP`
  ).run(kickUserId, username, accessToken, refreshToken);
}

export function updateTokens(
  kickUserId: number,
  accessToken: string,
  refreshToken: string
): void {
  db.prepare(
    "UPDATE auth_user SET access_token = ?, refresh_token = ? WHERE kick_user_id = ?"
  ).run(accessToken, refreshToken, kickUserId);
}

export function deleteAuthUser(kickUserId: number): void {
  db.prepare("DELETE FROM auth_user WHERE kick_user_id = ?").run(kickUserId);
}

export function insertWinner(
  kickUserId: number,
  username: string,
  keyword: string
): Winner {
  const info = db
    .prepare(
      "INSERT INTO winners (kick_user_id, username, keyword) VALUES (?, ?, ?)"
    )
    .run(kickUserId, username, keyword);
  return db
    .prepare("SELECT * FROM winners WHERE id = ?")
    .get(info.lastInsertRowid) as Winner;
}

export function getWinners(limit: number = 50): Winner[] {
  return db
    .prepare("SELECT * FROM winners ORDER BY won_at DESC LIMIT ?")
    .all(limit) as Winner[];
}

export default db;
