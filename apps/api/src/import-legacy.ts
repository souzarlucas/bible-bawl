import 'dotenv/config'
import mysql from 'mysql2/promise'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { db, databaseFile, initializeDatabase, recordChange } from './database.js'

const required = ['LEGACY_DB_HOST', 'LEGACY_DB_USER', 'LEGACY_DB_PASSWORD', 'LEGACY_DB_NAME'] as const
for (const name of required) {
  if (!process.env[name]) throw new Error(`Falta configurar ${name}. Consulte MIGRACAO-DO-LINUX.md.`)
}

initializeDatabase()
mkdirSync(resolve(process.cwd(), '../../backups'), { recursive: true })
const backup = resolve(process.cwd(), `../../backups/antes-da-importacao-${Date.now()}.db`)
copyFileSync(databaseFile, backup)

const legacy = await mysql.createConnection({
  host: process.env.LEGACY_DB_HOST,
  port: Number(process.env.LEGACY_DB_PORT || 3306),
  user: process.env.LEGACY_DB_USER,
  password: process.env.LEGACY_DB_PASSWORD,
  database: process.env.LEGACY_DB_NAME,
  ssl: process.env.LEGACY_DB_SSL === 'true' ? {} : undefined
})

const [categories] = await legacy.query<any[]>('SELECT * FROM categorias')
const [helpers] = await legacy.query<any[]>('SELECT * FROM respondedores')
const [teams] = await legacy.query<any[]>('SELECT * FROM equipes')
const [participants] = await legacy.query<any[]>('SELECT * FROM participantes')
const [questions] = await legacy.query<any[]>('SELECT * FROM perguntas')
const [answers] = await legacy.query<any[]>('SELECT * FROM participante_pergunta')

const categoryMap = new Map<number, string>()
const helperMap = new Map<number, string>()
const teamMap = new Map<number, string>()
const participantMap = new Map<number, string>()
const now = new Date().toISOString()

const importAll = db.transaction(() => {
  for (const row of categories) {
    const known = db.prepare('SELECT id FROM categories WHERE lower(name)=lower(?)').get(row.nome) as { id: string } | undefined
    const id = known?.id || `legado-categoria-${row.id}`; categoryMap.set(row.id, id)
    db.prepare(`INSERT INTO categories(id,name,description,min_age,max_age,updated_at) VALUES(?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,min_age=excluded.min_age,max_age=excluded.max_age,updated_at=excluded.updated_at`)
      .run(id, row.nome, row.descricao || row.nome, row.idade_min, row.idade_max, now)
  }
  for (const row of helpers) {
    const id = `legado-auxiliar-${row.id}`; helperMap.set(row.id, id)
    db.prepare(`INSERT INTO helpers(id,name,access_code,updated_at) VALUES(?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,access_code=excluded.access_code,updated_at=excluded.updated_at,deleted_at=NULL`)
      .run(id, row.nome, row.cod_acesso || null, now)
  }
  for (const row of teams) {
    const id = `legado-equipe-${row.id}`; teamMap.set(row.id, id)
    db.prepare(`INSERT INTO teams(id,name,category_id,helper_id,updated_at) VALUES(?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,category_id=excluded.category_id,helper_id=excluded.helper_id,updated_at=excluded.updated_at,deleted_at=NULL`)
      .run(id, row.nome, categoryMap.get(row.categoria_id), helperMap.get(row.respondedor_id) || null, now)
  }
  for (const row of participants) {
    const id = `legado-participante-${row.id}`; participantMap.set(row.id, id)
    db.prepare(`INSERT INTO participants(id,name,birth_date,team_id,status,position,updated_at) VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,birth_date=excluded.birth_date,team_id=excluded.team_id,status=excluded.status,position=excluded.position,updated_at=excluded.updated_at,deleted_at=NULL`)
      .run(id, row.nome, String(row.data_nascimento).slice(0,10), teamMap.get(row.equipe_id), row.status_id === 2 ? 'substituto' : 'titular', row.id, now)
  }
  for (const row of questions) {
    const status = row.status_id === 2 ? 'respondida' : row.status_id === 3 ? 'cancelada' : 'nao_respondida'
    db.prepare(`INSERT INTO questions(id,status,is_current,updated_at) VALUES(?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status,is_current=excluded.is_current,updated_at=excluded.updated_at`)
      .run(row.id, status, row.pergunta_atual ? 1 : 0, now)
  }
  for (const row of answers) {
    const participantId = participantMap.get(row.participante_id)
    if (!participantId) continue
    db.prepare(`INSERT INTO answers(id,question_id,participant_id,correct,device_id,updated_at) VALUES(?,?,?,?,?,?)
      ON CONFLICT(question_id,participant_id) DO UPDATE SET correct=excluded.correct,updated_at=excluded.updated_at`)
      .run(`legado-resposta-${row.id}`, row.pergunta_id, participantId, row.resposta ? 1 : 0, 'maquina-linux', now)
  }
  recordChange('legacy-import', now)
})

try {
  importAll()
  console.log('Importação concluída sem alterar o banco Linux.')
  console.log(`Categorias: ${categories.length}; auxiliares: ${helpers.length}; equipes: ${teams.length}`)
  console.log(`Participantes: ${participants.length}; perguntas: ${questions.length}; respostas: ${answers.length}`)
  console.log(`Backup anterior à importação: ${backup}`)
} finally {
  await legacy.end()
}
