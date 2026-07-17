import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { createToken, readToken, type Session, verifyPassword } from './security'
import { ensureDatabase, getSnapshot, recordChange } from './database'

type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
  JWT_SECRET?: string
  INITIAL_ADMIN_PASSWORD?: string
  APP_ENV: string
}
type Variables = { session: Session }
type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
const defaultSecret = 'preview-bible-bawl-change-before-production-2026'
const now = () => new Date().toISOString()

app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  maxAge: 86400
}))

app.use('/api/*', async (context, next) => {
  const localPassword = context.env.APP_ENV === 'preview' ? 'troque123' : ''
  await ensureDatabase(
    context.env.DB,
    context.env.INITIAL_ADMIN_PASSWORD || localPassword,
    context.env.JWT_SECRET || defaultSecret
  )
  await next()
})

app.use('/api/*', async (context, next) => {
  if (context.req.path === '/api/health' || context.req.path === '/api/auth/login') return next()
  try {
    const token = context.req.header('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return context.json({ message: 'Entre novamente para continuar.' }, 401)
    context.set('session', await readToken(token, context.env.JWT_SECRET || defaultSecret))
    return next()
  } catch {
    return context.json({ message: 'Sua sessão expirou. Entre novamente.' }, 401)
  }
})

async function body(context: AppContext) {
  try { return await context.req.json<Record<string, any>>() } catch { return {} }
}

app.get('/api/health', (context) => context.json({ ok: true, service: 'Bible Bawl Cloud', time: now(), environment: context.env.APP_ENV }))

app.post('/api/auth/login', async (context) => {
  const input = await body(context)
  if (!input.email || !input.password) return context.json({ message: 'Informe e-mail e senha.' }, 400)
  const user = await context.env.DB.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').bind(input.email).first<any>()
  if (!user || !(await verifyPassword(input.password, user.password_hash, context.env.JWT_SECRET || defaultSecret))) {
    return context.json({ message: 'E-mail ou senha incorretos.' }, 401)
  }
  const session: Session = { userId: user.id, name: user.name, role: user.role }
  return context.json({ token: await createToken(session, context.env.JWT_SECRET || defaultSecret), user: session })
})

app.get('/api/sync', async (context) => context.json(await getSnapshot(context.env.DB)))

app.post('/api/helpers', async (context) => {
  const input = await body(context)
  if (!String(input.name || '').trim()) return context.json({ message: 'Informe o nome do auxiliar.' }, 400)
  const id = input.id || crypto.randomUUID(); const changedAt = now()
  await context.env.DB.prepare(`INSERT INTO helpers(id,name,access_code,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,access_code=excluded.access_code,updated_at=excluded.updated_at,deleted_at=NULL`)
    .bind(id,String(input.name).trim(),input.accessCode || null,changedAt).run()
  await recordChange(context.env.DB,'helpers',id)
  return context.json({ id,name:String(input.name).trim(),access_code:input.accessCode || null,updated_at:changedAt },201)
})

app.post('/api/teams', async (context) => {
  const input = await body(context)
  if (!input.name || !input.categoryId) return context.json({ message: 'Confira o nome e a categoria da equipe.' },400)
  const id = input.id || crypto.randomUUID(); const changedAt = now()
  await context.env.DB.prepare(`INSERT INTO teams(id,name,category_id,helper_id,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,category_id=excluded.category_id,helper_id=excluded.helper_id,updated_at=excluded.updated_at,deleted_at=NULL`)
    .bind(id,String(input.name).trim(),input.categoryId,input.helperId || null,changedAt).run()
  await recordChange(context.env.DB,'teams',id)
  return context.json({ id,updated_at:changedAt },201)
})

app.post('/api/participants', async (context) => {
  const input = await body(context)
  if (!input.name || !input.birthDate || !input.teamId) return context.json({ message: 'Confira os dados do participante.' },400)
  const id = input.id || crypto.randomUUID(); const changedAt = now()
  await context.env.DB.prepare(`INSERT INTO participants(id,name,birth_date,team_id,status,position,updated_at) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,birth_date=excluded.birth_date,team_id=excluded.team_id,status=excluded.status,position=excluded.position,updated_at=excluded.updated_at,deleted_at=NULL`)
    .bind(id,String(input.name).trim(),input.birthDate,input.teamId,input.status === 'substituto' ? 'substituto' : 'titular',Number(input.position || 0),changedAt).run()
  await recordChange(context.env.DB,'participants',id)
  return context.json({ id,updated_at:changedAt },201)
})

app.post('/api/questions/current', async (context) => {
  const input = await body(context); const questionId = Number(input.questionId)
  if (!Number.isInteger(questionId) || questionId < 0 || questionId > 150) return context.json({ message: 'Pergunta inválida.' },400)
  const changedAt = now()
  const statements = [context.env.DB.prepare('UPDATE questions SET is_current=0,updated_at=? WHERE is_current=1').bind(changedAt)]
  if (questionId > 0) statements.push(context.env.DB.prepare('UPDATE questions SET is_current=1,updated_at=? WHERE id=?').bind(changedAt,questionId))
  statements.push(context.env.DB.prepare('INSERT INTO changes(entity,entity_id,operation,changed_at) VALUES(?,?,?,?)').bind('questions',String(questionId || 'blocked'),'upsert',changedAt))
  await context.env.DB.batch(statements)
  return context.json({ questionId })
})

app.post('/api/answers', async (context) => {
  const input = await body(context); const questionId = Number(input.questionId)
  if (!Number.isInteger(questionId) || !input.participantId || typeof input.correct !== 'boolean') return context.json({ message: 'Resposta inválida.' },400)
  const id = input.id || crypto.randomUUID(); const changedAt = now()
  await context.env.DB.batch([
    context.env.DB.prepare(`INSERT INTO answers(id,question_id,participant_id,correct,device_id,updated_at) VALUES(?,?,?,?,?,?)
      ON CONFLICT(question_id,participant_id) DO UPDATE SET correct=excluded.correct,device_id=excluded.device_id,updated_at=excluded.updated_at`)
      .bind(id,questionId,input.participantId,input.correct ? 1 : 0,input.deviceId || 'desconhecido',changedAt),
    context.env.DB.prepare("UPDATE questions SET status='respondida',updated_at=? WHERE id=?").bind(changedAt,questionId),
    context.env.DB.prepare('INSERT INTO changes(entity,entity_id,operation,changed_at) VALUES(?,?,?,?)').bind('answers',id,'upsert',changedAt)
  ])
  return context.json({ id,updated_at:changedAt },201)
})

app.get('/api/results', async (context) => {
  const [individual,teams] = await context.env.DB.batch([
    context.env.DB.prepare(`SELECT p.id,p.name,t.name AS team,c.name AS category,COALESCE(SUM(a.correct),0) AS points
      FROM participants p JOIN teams t ON t.id=p.team_id JOIN categories c ON c.id=t.category_id
      LEFT JOIN answers a ON a.participant_id=p.id WHERE p.deleted_at IS NULL GROUP BY p.id ORDER BY c.min_age,points DESC,p.name`),
    context.env.DB.prepare(`SELECT t.id,t.name,c.name AS category,COALESCE(SUM(a.correct),0) AS points
      FROM teams t JOIN categories c ON c.id=t.category_id LEFT JOIN participants p ON p.team_id=t.id
      LEFT JOIN answers a ON a.participant_id=p.id WHERE t.deleted_at IS NULL GROUP BY t.id ORDER BY c.min_age,points DESC,t.name`)
  ])
  return context.json({ individual:individual.results,teams:teams.results })
})

app.onError((error,context) => {
  console.error(error)
  if (String(error.message).includes('UNIQUE constraint')) return context.json({ message: 'Já existe um cadastro com essa informação.' },409)
  return context.json({ message: 'Não foi possível concluir. Tente novamente.' },500)
})

app.notFound((context) => context.json({ message: 'Endereço não encontrado.' },404))

export default app
