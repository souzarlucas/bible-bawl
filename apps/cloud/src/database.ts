import { hashPassword } from './security'

const schema = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY,actor_user_id TEXT,actor_name TEXT NOT NULL,action TEXT NOT NULL,target_type TEXT NOT NULL,target_id TEXT,details TEXT,created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,description TEXT NOT NULL,min_age INTEGER NOT NULL,max_age INTEGER NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS helpers (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,access_code TEXT UNIQUE,updated_at TEXT NOT NULL,deleted_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,category_id TEXT NOT NULL,helper_id TEXT,updated_at TEXT NOT NULL,deleted_at TEXT,FOREIGN KEY(category_id) REFERENCES categories(id),FOREIGN KEY(helper_id) REFERENCES helpers(id))`,
  `CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY,name TEXT NOT NULL,birth_date TEXT NOT NULL,team_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'titular',position INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,deleted_at TEXT,FOREIGN KEY(team_id) REFERENCES teams(id))`,
  `CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY,status TEXT NOT NULL DEFAULT 'nao_respondida',is_current INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS answers (id TEXT PRIMARY KEY,question_id INTEGER NOT NULL,participant_id TEXT NOT NULL,correct INTEGER NOT NULL,device_id TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(question_id,participant_id),FOREIGN KEY(question_id) REFERENCES questions(id),FOREIGN KEY(participant_id) REFERENCES participants(id))`,
  `CREATE TABLE IF NOT EXISTS changes (version INTEGER PRIMARY KEY AUTOINCREMENT,entity TEXT NOT NULL,entity_id TEXT NOT NULL,operation TEXT NOT NULL,changed_at TEXT NOT NULL)`
]

async function ensureUserColumns(db: D1Database) {
  const columns = await db.prepare('PRAGMA table_info(users)').all<{ name: string }>()
  const names = new Set(columns.results.map((column) => column.name))
  if (!names.has('is_primary')) await db.prepare('ALTER TABLE users ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0').run()
  if (!names.has('active')) await db.prepare('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1').run()
  if (!names.has('last_login_at')) await db.prepare('ALTER TABLE users ADD COLUMN last_login_at TEXT').run()
  if (!names.has('auth_version')) await db.prepare('ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 1').run()
}

export async function ensureDatabase(db: D1Database, initialAdminPassword: string, passwordPepper: string) {
  await db.batch(schema.map((sql) => db.prepare(sql)))
  await ensureUserColumns(db)
  const now = new Date().toISOString()
  const categoryCount = await db.prepare('SELECT COUNT(*) AS total FROM categories').first<{ total: number }>()
  if (!categoryCount?.total) {
    await db.batch([
      db.prepare('INSERT INTO categories(id,name,description,min_age,max_age,updated_at) VALUES(?,?,?,?,?,?)').bind('infantil','Infantil','De 6 até 12 anos',6,12,now),
      db.prepare('INSERT INTO categories(id,name,description,min_age,max_age,updated_at) VALUES(?,?,?,?,?,?)').bind('juvenil','Juvenil','De 13 até 25 anos',13,25,now),
      db.prepare('INSERT INTO categories(id,name,description,min_age,max_age,updated_at) VALUES(?,?,?,?,?,?)').bind('adulto','Adulto','Acima de 25 anos',26,120,now)
    ])
  }
  const questionCount = await db.prepare('SELECT COUNT(*) AS total FROM questions').first<{ total: number }>()
  if (!questionCount?.total) {
    await db.prepare(`WITH RECURSIVE numbers(id) AS (VALUES(1) UNION ALL SELECT id+1 FROM numbers WHERE id<150)
      INSERT INTO questions(id,status,is_current,updated_at) SELECT id,'nao_respondida',0,? FROM numbers`).bind(now).run()
  }
  const userCount = await db.prepare('SELECT COUNT(*) AS total FROM users').first<{ total: number }>()
  if (!userCount?.total) {
    if (!initialAdminPassword) throw new Error('INITIAL_ADMIN_PASSWORD não foi configurada.')
    await db.prepare('INSERT INTO users(id,name,email,password_hash,role,created_at,updated_at,is_primary,active) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(),'Lucas Souza','admin@local',await hashPassword(initialAdminPassword, passwordPepper),'admin',now,now,1,1).run()
  }
  await db.prepare(`UPDATE users SET is_primary=1,active=1
    WHERE id=(SELECT id FROM users WHERE role='admin' ORDER BY CASE WHEN lower(email)='admin@local' THEN 0 ELSE 1 END,created_at LIMIT 1)
      AND NOT EXISTS(SELECT 1 FROM users WHERE is_primary=1)`).run()
}

export async function recordAudit(
  db: D1Database,
  actor: { userId: string; name: string },
  action: string,
  targetType: string,
  targetId?: string | number | null,
  details?: Record<string, unknown>
) {
  await db.prepare('INSERT INTO audit_log(id,actor_user_id,actor_name,action,target_type,target_id,details,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),actor.userId,actor.name,action,targetType,targetId == null ? null : String(targetId),details ? JSON.stringify(details) : null,new Date().toISOString()).run()
}

export async function listUsers(db: D1Database) {
  const result = await db.prepare(`SELECT id,name,email,role,is_primary,active,last_login_at,created_at,updated_at
    FROM users ORDER BY is_primary DESC,active DESC,name COLLATE NOCASE`).all()
  return result.results
}

export async function listAudit(db: D1Database, limit = 100) {
  const result = await db.prepare(`SELECT id,actor_name,action,target_type,target_id,details,created_at
    FROM audit_log ORDER BY created_at DESC LIMIT ?`).bind(Math.min(Math.max(limit,1),200)).all()
  return result.results
}

export async function recordChange(db: D1Database, entity: string, id: string | number) {
  await db.prepare('INSERT INTO changes(entity,entity_id,operation,changed_at) VALUES(?,?,?,?)')
    .bind(entity,String(id),'upsert',new Date().toISOString()).run()
}

export async function getSnapshot(db: D1Database) {
  const [categories,helpers,teams,participants,questions,answers,version] = await db.batch([
    db.prepare('SELECT * FROM categories ORDER BY min_age'),
    db.prepare('SELECT * FROM helpers WHERE deleted_at IS NULL ORDER BY name'),
    db.prepare('SELECT * FROM teams WHERE deleted_at IS NULL ORDER BY name'),
    db.prepare('SELECT * FROM participants WHERE deleted_at IS NULL ORDER BY team_id,position,name'),
    db.prepare('SELECT * FROM questions ORDER BY id'),
    db.prepare('SELECT * FROM answers'),
    db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM changes')
  ])
  return {
    categories: categories.results, helpers: helpers.results, teams: teams.results,
    participants: participants.results, questions: questions.results, answers: answers.results,
    version: Number((version.results[0] as any)?.version || 0)
  }
}
