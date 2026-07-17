import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

const defaultFile = resolve(process.cwd(), '../../data/bible-bawl.db')
const databaseFile = process.env.DATABASE_FILE ? resolve(process.env.DATABASE_FILE) : defaultFile
mkdirSync(dirname(databaseFile), { recursive: true })

export const db = new Database(databaseFile)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','apresentador','auxiliar')),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, actor_user_id TEXT, actor_name TEXT NOT NULL, action TEXT NOT NULL,
      target_type TEXT NOT NULL, target_id TEXT, details TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL,
      min_age INTEGER NOT NULL, max_age INTEGER NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS helpers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, access_code TEXT UNIQUE,
      updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, category_id TEXT NOT NULL,
      helper_id TEXT, updated_at TEXT NOT NULL, deleted_at TEXT,
      FOREIGN KEY(category_id) REFERENCES categories(id), FOREIGN KEY(helper_id) REFERENCES helpers(id)
    );
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, birth_date TEXT NOT NULL,
      team_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'titular', position INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL, deleted_at TEXT, FOREIGN KEY(team_id) REFERENCES teams(id)
    );
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'nao_respondida', is_current INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY, question_id INTEGER NOT NULL, participant_id TEXT NOT NULL,
      correct INTEGER NOT NULL, device_id TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(question_id, participant_id), FOREIGN KEY(question_id) REFERENCES questions(id),
      FOREIGN KEY(participant_id) REFERENCES participants(id)
    );
    CREATE TABLE IF NOT EXISTS processed_operations (
      id TEXT PRIMARY KEY, processed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS changes (
      version INTEGER PRIMARY KEY AUTOINCREMENT, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
      operation TEXT NOT NULL, changed_at TEXT NOT NULL
    );
  `)
  const userColumns = new Set((db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>).map((column) => column.name))
  if (!userColumns.has('is_primary')) db.exec('ALTER TABLE users ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0')
  if (!userColumns.has('active')) db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1')
  if (!userColumns.has('last_login_at')) db.exec('ALTER TABLE users ADD COLUMN last_login_at TEXT')
  if (!userColumns.has('auth_version')) db.exec('ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 1')
}

const now = () => new Date().toISOString()

export function seed() {
  const createdAt = now()
  const categoryCount = db.prepare('SELECT COUNT(*) AS total FROM categories').get() as { total: number }
  if (!categoryCount.total) {
    const insert = db.prepare('INSERT INTO categories (id,name,description,min_age,max_age,updated_at) VALUES (?,?,?,?,?,?)')
    insert.run('infantil', 'Infantil', 'De 6 até 12 anos', 6, 12, createdAt)
    insert.run('juvenil', 'Juvenil', 'De 13 até 25 anos', 13, 25, createdAt)
    insert.run('adulto', 'Adulto', 'Acima de 25 anos', 26, 120, createdAt)
  }
  const questionCount = db.prepare('SELECT COUNT(*) AS total FROM questions').get() as { total: number }
  if (!questionCount.total) {
    const insert = db.prepare('INSERT INTO questions (id,status,is_current,updated_at) VALUES (?, ?, 0, ?)')
    const transaction = db.transaction(() => {
      for (let id = 1; id <= 150; id += 1) insert.run(id, 'nao_respondida', createdAt)
    })
    transaction()
  }
  const userCount = db.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number }
  if (!userCount.total) {
    db.prepare(`INSERT INTO users (id,name,email,password_hash,role,created_at,updated_at,is_primary,active)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(randomUUID(), 'Lucas Souza', 'admin@local', bcrypt.hashSync('troque123', 12), 'admin', createdAt, createdAt, 1, 1)
  }
  db.prepare(`UPDATE users SET is_primary=1,active=1
    WHERE id=(SELECT id FROM users WHERE role='admin' ORDER BY CASE WHEN lower(email)='admin@local' THEN 0 ELSE 1 END,created_at LIMIT 1)
      AND NOT EXISTS(SELECT 1 FROM users WHERE is_primary=1)`).run()
}

export function initializeDatabase() {
  migrate()
  seed()
}

export function recordChange(entity: string, id: string | number, operation = 'upsert') {
  db.prepare('INSERT INTO changes (entity,entity_id,operation,changed_at) VALUES (?,?,?,?)')
    .run(entity, String(id), operation, now())
}

export function recordAudit(actor: { userId: string; name: string }, action: string, targetType: string, targetId?: string | number | null, details?: Record<string, unknown>) {
  db.prepare('INSERT INTO audit_log(id,actor_user_id,actor_name,action,target_type,target_id,details,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(randomUUID(),actor.userId,actor.name,action,targetType,targetId == null ? null : String(targetId),details ? JSON.stringify(details) : null,now())
}

export function listUsers() {
  return db.prepare(`SELECT id,name,email,role,is_primary,active,last_login_at,created_at,updated_at
    FROM users ORDER BY is_primary DESC,active DESC,name COLLATE NOCASE`).all()
}

export function listAudit(limit = 100) {
  return db.prepare(`SELECT id,actor_name,action,target_type,target_id,details,created_at
    FROM audit_log ORDER BY created_at DESC LIMIT ?`).all(Math.min(Math.max(limit,1),200))
}

export function snapshot() {
  return {
    categories: db.prepare('SELECT * FROM categories ORDER BY min_age').all(),
    helpers: db.prepare('SELECT * FROM helpers WHERE deleted_at IS NULL ORDER BY name').all(),
    teams: db.prepare('SELECT * FROM teams WHERE deleted_at IS NULL ORDER BY name').all(),
    participants: db.prepare('SELECT * FROM participants WHERE deleted_at IS NULL ORDER BY team_id, position, name').all(),
    questions: db.prepare('SELECT * FROM questions ORDER BY id').all(),
    answers: db.prepare('SELECT * FROM answers').all(),
    version: (db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM changes').get() as { version: number }).version
  }
}

export { databaseFile }
