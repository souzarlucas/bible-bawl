import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { createToken, hashPassword, readToken, type Session, verifyPassword } from './security'
import { ensureDatabase, getSnapshot, listAudit, listUsers, recordAudit, recordChange } from './database'
import { canAssignRole, canConfigureGame, canManageTarget, canManageUsers, canPresent, type Role } from './authorization'

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
    const tokenSession = await readToken(token, context.env.JWT_SECRET || defaultSecret)
    const user = await context.env.DB.prepare('SELECT id,name,role,is_primary,active,auth_version FROM users WHERE id=?').bind(tokenSession.userId).first<any>()
    if (!user?.active) return context.json({ message: 'Esta conta foi bloqueada. Fale com o administrador principal.',code:'ACCOUNT_BLOCKED' }, 403)
    if (Number(tokenSession.authVersion || 0) !== Number(user.auth_version)) return context.json({ message:'Sua sessão foi encerrada por segurança. Entre novamente.',code:'SESSION_REVOKED' },401)
    context.set('session', { userId:user.id,name:user.name,role:user.role,isPrimary:Boolean(user.is_primary),authVersion:Number(user.auth_version) })
    return next()
  } catch {
    return context.json({ message: 'Sua sessão expirou. Entre novamente.' }, 401)
  }
})

async function body(context: AppContext) {
  try { return await context.req.json<Record<string, any>>() } catch { return {} }
}

const validRoles: Role[] = ['admin','apresentador','auxiliar']
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const strongPassword = (value: unknown) => typeof value === 'string' && value.length >= 10
const forbidden = (context: AppContext) => context.json({ message: 'Sua conta não tem permissão para esta ação.' }, 403)

app.get('/api/health', (context) => context.json({ ok: true, service: 'Bible Bawl Cloud', time: now(), environment: context.env.APP_ENV }))

app.post('/api/auth/login', async (context) => {
  const input = await body(context)
  if (!input.email || !input.password) return context.json({ message: 'Informe e-mail e senha.' }, 400)
  const user = await context.env.DB.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').bind(input.email).first<any>()
  if (!user || !user.active || !(await verifyPassword(input.password, user.password_hash, context.env.JWT_SECRET || defaultSecret))) {
    return context.json({ message: 'E-mail ou senha incorretos.' }, 401)
  }
  const session: Session = { userId:user.id,name:user.name,role:user.role,isPrimary:Boolean(user.is_primary),authVersion:Number(user.auth_version) }
  await context.env.DB.prepare('UPDATE users SET last_login_at=? WHERE id=?').bind(now(),user.id).run()
  await recordAudit(context.env.DB,session,'login','session',user.id)
  return context.json({ token: await createToken(session, context.env.JWT_SECRET || defaultSecret), user: session })
})

app.post('/api/auth/change-password', async (context) => {
  const session = context.get('session'); const input = await body(context)
  if (!strongPassword(input.newPassword)) return context.json({ message: 'A nova senha precisa ter pelo menos 10 caracteres.' },400)
  const user = await context.env.DB.prepare('SELECT password_hash FROM users WHERE id=?').bind(session.userId).first<any>()
  if (!user || !(await verifyPassword(String(input.currentPassword || ''),user.password_hash,context.env.JWT_SECRET || defaultSecret))) {
    return context.json({ message: 'A senha atual está incorreta.' },401)
  }
  await context.env.DB.prepare('UPDATE users SET password_hash=?,auth_version=auth_version+1,updated_at=? WHERE id=?')
    .bind(await hashPassword(input.newPassword,context.env.JWT_SECRET || defaultSecret),now(),session.userId).run()
  await recordAudit(context.env.DB,session,'password_changed','user',session.userId)
  return context.json({ ok:true })
})

app.get('/api/users', async (context) => {
  if (!canManageUsers(context.get('session'))) return forbidden(context)
  return context.json({ users:await listUsers(context.env.DB) })
})

app.post('/api/users', async (context) => {
  const session=context.get('session'); if (!canManageUsers(session)) return forbidden(context)
  const input=await body(context); const role=String(input.role || '') as Role
  const name=String(input.name || '').trim(); const email=String(input.email || '').trim().toLowerCase()
  if (name.length < 2 || !emailPattern.test(email) || !validRoles.includes(role) || !strongPassword(input.password)) {
    return context.json({ message: 'Informe nome, e-mail válido, perfil e uma senha com pelo menos 10 caracteres.' },400)
  }
  if (!canAssignRole(session,role)) return context.json({ message: 'Somente o administrador principal pode criar outros administradores.' },403)
  const id=crypto.randomUUID(); const createdAt=now()
  await context.env.DB.prepare('INSERT INTO users(id,name,email,password_hash,role,created_at,updated_at,is_primary,active) VALUES(?,?,?,?,?,?,?,?,?)')
    .bind(id,name,email,await hashPassword(input.password,context.env.JWT_SECRET || defaultSecret),role,createdAt,createdAt,0,1).run()
  await recordAudit(context.env.DB,session,'user_created','user',id,{ name,email,role })
  return context.json({ id,name,email,role,is_primary:0,active:1,created_at:createdAt,updated_at:createdAt },201)
})

app.post('/api/users/:id/status', async (context) => {
  const session=context.get('session'); const target=await context.env.DB.prepare('SELECT id,name,email,role,is_primary,active FROM users WHERE id=?').bind(context.req.param('id')).first<any>()
  if (!target) return context.json({ message: 'Conta não encontrada.' },404)
  if (!canManageTarget(session,target)) return forbidden(context)
  const input=await body(context); if (typeof input.active !== 'boolean') return context.json({ message: 'Informe se a conta deve ficar ativa ou bloqueada.' },400)
  await context.env.DB.prepare('UPDATE users SET active=?,updated_at=? WHERE id=?').bind(input.active ? 1 : 0,now(),target.id).run()
  await recordAudit(context.env.DB,session,input.active ? 'user_activated' : 'user_blocked','user',target.id,{ name:target.name,email:target.email })
  return context.json({ id:target.id,active:input.active ? 1 : 0 })
})

app.post('/api/users/:id/password', async (context) => {
  const session=context.get('session'); const target=await context.env.DB.prepare('SELECT id,name,email,role,is_primary FROM users WHERE id=?').bind(context.req.param('id')).first<any>()
  if (!target) return context.json({ message: 'Conta não encontrada.' },404)
  if (!canManageTarget(session,target)) return forbidden(context)
  const input=await body(context); if (!strongPassword(input.password)) return context.json({ message: 'A nova senha precisa ter pelo menos 10 caracteres.' },400)
  await context.env.DB.prepare('UPDATE users SET password_hash=?,auth_version=auth_version+1,updated_at=? WHERE id=?')
    .bind(await hashPassword(input.password,context.env.JWT_SECRET || defaultSecret),now(),target.id).run()
  await recordAudit(context.env.DB,session,'password_reset','user',target.id,{ name:target.name,email:target.email })
  return context.json({ ok:true })
})

app.get('/api/audit', async (context) => {
  if (!canManageUsers(context.get('session'))) return forbidden(context)
  return context.json({ entries:await listAudit(context.env.DB,Number(context.req.query('limit') || 100)) })
})

app.get('/api/sync', async (context) => context.json(await getSnapshot(context.env.DB)))

app.post('/api/helpers', async (context) => {
  const session=context.get('session'); if (!canConfigureGame(session)) return forbidden(context)
  const input = await body(context)
  if (!String(input.name || '').trim()) return context.json({ message: 'Informe o nome do auxiliar.' }, 400)
  const id = input.id || crypto.randomUUID(); const changedAt = now()
  await context.env.DB.prepare(`INSERT INTO helpers(id,name,access_code,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,access_code=excluded.access_code,updated_at=excluded.updated_at,deleted_at=NULL`)
    .bind(id,String(input.name).trim(),input.accessCode || null,changedAt).run()
  await recordChange(context.env.DB,'helpers',id)
  await recordAudit(context.env.DB,session,'helper_saved','helper',id,{ name:String(input.name).trim() })
  return context.json({ id,name:String(input.name).trim(),access_code:input.accessCode || null,updated_at:changedAt },201)
})

app.post('/api/teams', async (context) => {
  const session=context.get('session'); if (!canConfigureGame(session)) return forbidden(context)
  const input = await body(context)
  if (!input.name || !input.categoryId) return context.json({ message: 'Confira o nome e a categoria da equipe.' },400)
  const id = input.id || crypto.randomUUID(); const changedAt = now()
  await context.env.DB.prepare(`INSERT INTO teams(id,name,category_id,helper_id,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,category_id=excluded.category_id,helper_id=excluded.helper_id,updated_at=excluded.updated_at,deleted_at=NULL`)
    .bind(id,String(input.name).trim(),input.categoryId,input.helperId || null,changedAt).run()
  await recordChange(context.env.DB,'teams',id)
  await recordAudit(context.env.DB,session,'team_saved','team',id,{ name:String(input.name).trim() })
  return context.json({ id,updated_at:changedAt },201)
})

app.post('/api/participants', async (context) => {
  const session=context.get('session'); if (!canConfigureGame(session)) return forbidden(context)
  const input = await body(context)
  if (!input.name || !input.birthDate || !input.teamId) return context.json({ message: 'Confira os dados do participante.' },400)
  const id = input.id || crypto.randomUUID(); const changedAt = now()
  await context.env.DB.prepare(`INSERT INTO participants(id,name,birth_date,team_id,status,position,updated_at) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,birth_date=excluded.birth_date,team_id=excluded.team_id,status=excluded.status,position=excluded.position,updated_at=excluded.updated_at,deleted_at=NULL`)
    .bind(id,String(input.name).trim(),input.birthDate,input.teamId,input.status === 'substituto' ? 'substituto' : 'titular',Number(input.position || 0),changedAt).run()
  await recordChange(context.env.DB,'participants',id)
  await recordAudit(context.env.DB,session,'participant_saved','participant',id,{ name:String(input.name).trim() })
  return context.json({ id,updated_at:changedAt },201)
})

app.post('/api/questions/current', async (context) => {
  const session=context.get('session'); if (!canPresent(session)) return forbidden(context)
  const input = await body(context); const questionId = Number(input.questionId)
  if (!Number.isInteger(questionId) || questionId < 0 || questionId > 150) return context.json({ message: 'Pergunta inválida.' },400)
  const changedAt = now()
  const statements = [context.env.DB.prepare('UPDATE questions SET is_current=0,updated_at=? WHERE is_current=1').bind(changedAt)]
  if (questionId > 0) statements.push(context.env.DB.prepare('UPDATE questions SET is_current=1,updated_at=? WHERE id=?').bind(changedAt,questionId))
  statements.push(context.env.DB.prepare('INSERT INTO changes(entity,entity_id,operation,changed_at) VALUES(?,?,?,?)').bind('questions',String(questionId || 'blocked'),'upsert',changedAt))
  await context.env.DB.batch(statements)
  await recordAudit(context.env.DB,session,questionId > 0 ? 'question_opened' : 'answers_blocked','question',questionId || null)
  return context.json({ questionId })
})

app.post('/api/answers', async (context) => {
  const session=context.get('session')
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
  await recordAudit(context.env.DB,session,'answer_saved','answer',id,{ questionId,participantId:input.participantId,correct:input.correct })
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
