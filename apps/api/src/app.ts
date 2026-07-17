import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { createToken, requireAuth } from './auth.js'
import { db, initializeDatabase, recordChange, snapshot } from './database.js'

export function createApp() {
  initializeDatabase()
  const app = express()
  app.use(cors({ origin: process.env.WEB_ORIGIN?.split(',') || true }))
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Bible Bawl API', time: new Date().toISOString() }))

  app.post('/api/auth/login', async (req, res) => {
    const parsed = z.object({ email: z.string().trim().min(3), password: z.string().min(1) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Informe e-mail e senha.' })
    const user = db.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').get(parsed.data.email) as any
    if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' })
    }
    const session = { userId: user.id, name: user.name, role: user.role }
    res.json({ token: await createToken(session), user: session })
  })

  app.get('/api/sync', requireAuth, (_req, res) => res.json(snapshot()))

  app.post('/api/helpers', requireAuth, (req, res) => {
    const parsed = z.object({ id: z.string().optional(), name: z.string().trim().min(2), accessCode: z.string().trim().optional() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Informe o nome do auxiliar.' })
    const id = parsed.data.id || randomUUID(); const changedAt = new Date().toISOString()
    db.prepare(`INSERT INTO helpers (id,name,access_code,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,access_code=excluded.access_code,updated_at=excluded.updated_at,deleted_at=NULL`)
      .run(id, parsed.data.name, parsed.data.accessCode || null, changedAt)
    recordChange('helpers', id)
    res.status(201).json({ id, name: parsed.data.name, access_code: parsed.data.accessCode || null, updated_at: changedAt })
  })

  app.post('/api/teams', requireAuth, (req, res) => {
    const parsed = z.object({ id: z.string().optional(), name: z.string().trim().min(2), categoryId: z.string(), helperId: z.string().nullable().optional() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Confira o nome e a categoria da equipe.' })
    const id = parsed.data.id || randomUUID(); const changedAt = new Date().toISOString()
    db.prepare(`INSERT INTO teams (id,name,category_id,helper_id,updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,category_id=excluded.category_id,helper_id=excluded.helper_id,updated_at=excluded.updated_at,deleted_at=NULL`)
      .run(id, parsed.data.name, parsed.data.categoryId, parsed.data.helperId || null, changedAt)
    recordChange('teams', id)
    res.status(201).json({ id, updated_at: changedAt })
  })

  app.post('/api/participants', requireAuth, (req, res) => {
    const parsed = z.object({ id: z.string().optional(), name: z.string().trim().min(2), birthDate: z.string(), teamId: z.string(), status: z.enum(['titular','substituto']).default('titular'), position: z.number().int().min(0).default(0) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Confira os dados do participante.' })
    const id = parsed.data.id || randomUUID(); const changedAt = new Date().toISOString()
    db.prepare(`INSERT INTO participants (id,name,birth_date,team_id,status,position,updated_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,birth_date=excluded.birth_date,team_id=excluded.team_id,status=excluded.status,position=excluded.position,updated_at=excluded.updated_at,deleted_at=NULL`)
      .run(id, parsed.data.name, parsed.data.birthDate, parsed.data.teamId, parsed.data.status, parsed.data.position, changedAt)
    recordChange('participants', id)
    res.status(201).json({ id, updated_at: changedAt })
  })

  app.post('/api/questions/current', requireAuth, (req, res) => {
    const parsed = z.object({ questionId: z.number().int().min(0).max(150) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Pergunta inválida.' })
    const changedAt = new Date().toISOString()
    const change = db.transaction(() => {
      db.prepare('UPDATE questions SET is_current=0, updated_at=? WHERE is_current=1').run(changedAt)
      if (parsed.data.questionId > 0) db.prepare('UPDATE questions SET is_current=1, updated_at=? WHERE id=?').run(changedAt, parsed.data.questionId)
      recordChange('questions', parsed.data.questionId || 'blocked')
    })
    change(); res.json({ questionId: parsed.data.questionId })
  })

  app.post('/api/answers', requireAuth, (req, res) => {
    const parsed = z.object({ id: z.string().optional(), questionId: z.number().int().positive(), participantId: z.string(), correct: z.boolean(), deviceId: z.string().min(1) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Resposta inválida.' })
    const id = parsed.data.id || randomUUID(); const changedAt = new Date().toISOString()
    db.prepare(`INSERT INTO answers (id,question_id,participant_id,correct,device_id,updated_at) VALUES (?,?,?,?,?,?)
      ON CONFLICT(question_id,participant_id) DO UPDATE SET correct=excluded.correct,device_id=excluded.device_id,updated_at=excluded.updated_at`)
      .run(id, parsed.data.questionId, parsed.data.participantId, parsed.data.correct ? 1 : 0, parsed.data.deviceId, changedAt)
    db.prepare(`UPDATE questions SET status='respondida',updated_at=? WHERE id=?`).run(changedAt, parsed.data.questionId)
    recordChange('answers', id)
    res.status(201).json({ id, updated_at: changedAt })
  })

  app.get('/api/results', requireAuth, (_req, res) => {
    const individual = db.prepare(`SELECT p.id,p.name,t.name AS team,c.name AS category,COALESCE(SUM(a.correct),0) AS points
      FROM participants p JOIN teams t ON t.id=p.team_id JOIN categories c ON c.id=t.category_id
      LEFT JOIN answers a ON a.participant_id=p.id WHERE p.deleted_at IS NULL
      GROUP BY p.id ORDER BY c.min_age, points DESC, p.name`).all()
    const teams = db.prepare(`SELECT t.id,t.name,c.name AS category,COALESCE(SUM(a.correct),0) AS points
      FROM teams t JOIN categories c ON c.id=t.category_id LEFT JOIN participants p ON p.team_id=t.id
      LEFT JOIN answers a ON a.participant_id=p.id WHERE t.deleted_at IS NULL
      GROUP BY t.id ORDER BY c.min_age, points DESC, t.name`).all()
    res.json({ individual, teams })
  })

  app.post('/api/sync/push', requireAuth, (req, res) => {
    const operations = z.array(z.object({ id: z.string(), endpoint: z.string().startsWith('/api/'), body: z.record(z.string(), z.unknown()) })).safeParse(req.body?.operations)
    if (!operations.success) return res.status(400).json({ message: 'Fila de sincronização inválida.' })
    // O cliente envia cada item pelos endpoints normais. Este endpoint confirma operações já processadas.
    const accepted: string[] = []
    for (const operation of operations.data) {
      const seen = db.prepare('SELECT id FROM processed_operations WHERE id=?').get(operation.id)
      if (seen) accepted.push(operation.id)
    }
    res.json({ accepted, snapshot: snapshot() })
  })

  app.use((_req, res) => res.status(404).json({ message: 'Endereço não encontrado.' }))
  return app
}
