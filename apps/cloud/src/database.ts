import { hashPassword } from './security'

const schema = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,description TEXT NOT NULL,min_age INTEGER NOT NULL,max_age INTEGER NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS helpers (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,access_code TEXT UNIQUE,updated_at TEXT NOT NULL,deleted_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,category_id TEXT NOT NULL,helper_id TEXT,updated_at TEXT NOT NULL,deleted_at TEXT,FOREIGN KEY(category_id) REFERENCES categories(id),FOREIGN KEY(helper_id) REFERENCES helpers(id))`,
  `CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY,name TEXT NOT NULL,birth_date TEXT NOT NULL,team_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'titular',position INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,deleted_at TEXT,FOREIGN KEY(team_id) REFERENCES teams(id))`,
  `CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY,status TEXT NOT NULL DEFAULT 'nao_respondida',is_current INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS answers (id TEXT PRIMARY KEY,question_id INTEGER NOT NULL,participant_id TEXT NOT NULL,correct INTEGER NOT NULL,device_id TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(question_id,participant_id),FOREIGN KEY(question_id) REFERENCES questions(id),FOREIGN KEY(participant_id) REFERENCES participants(id))`,
  `CREATE TABLE IF NOT EXISTS changes (version INTEGER PRIMARY KEY AUTOINCREMENT,entity TEXT NOT NULL,entity_id TEXT NOT NULL,operation TEXT NOT NULL,changed_at TEXT NOT NULL)`
]

export async function ensureDatabase(db: D1Database, initialAdminPassword: string) {
  await db.batch(schema.map((sql) => db.prepare(sql)))
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
    await db.prepare('INSERT INTO users(id,name,email,password_hash,role,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(),'Administrador','admin@local',await hashPassword(initialAdminPassword),'admin',now,now).run()
  }
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
