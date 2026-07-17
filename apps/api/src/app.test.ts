import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app.js'
import { db } from './database.js'

describe('Bible Bawl API', () => {
  it('informa que está funcionando', async () => {
    const response = await request(createApp()).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
  })

  it('entra com o administrador inicial', async () => {
    const response = await request(createApp()).post('/api/auth/login').send({ email: 'admin@local', password: 'troque123' })
    expect(response.status).toBe(200)
    expect(response.body.user.role).toBe('admin')
    expect(response.body.user.isPrimary).toBe(true)
  })

  it('protege o administrador principal e bloqueia colaboradores imediatamente', async () => {
    const app=createApp();const login=await request(app).post('/api/auth/login').send({ email:'admin@local',password:'troque123' })
    const ownerAuth={ Authorization:`Bearer ${login.body.token}` };const suffix=Date.now().toString();const email=`auxiliar-${suffix}@teste.local`;let userId=''
    try {
      const created=await request(app).post('/api/users').set(ownerAuth).send({ name:'Auxiliar Teste',email,role:'auxiliar',password:'senha-forte-123' })
      expect(created.status).toBe(201);userId=created.body.id
      const collaboratorLogin=await request(app).post('/api/auth/login').send({ email,password:'senha-forte-123' })
      expect(collaboratorLogin.status).toBe(200)
      const collaboratorAuth={ Authorization:`Bearer ${collaboratorLogin.body.token}` }
      expect((await request(app).post('/api/users').set(collaboratorAuth).send({ name:'Invasor',email:`outro-${suffix}@teste.local`,role:'admin',password:'senha-forte-456' })).status).toBe(403)
      expect((await request(app).post('/api/teams').set(collaboratorAuth).send({ name:`Equipe proibida ${suffix}`,categoryId:'infantil' })).status).toBe(403)
      expect((await request(app).post(`/api/users/${userId}/status`).set(ownerAuth).send({ active:false })).status).toBe(200)
      expect((await request(app).get('/api/sync').set(collaboratorAuth)).status).toBe(403)
      expect((await request(app).post(`/api/users/${login.body.user.userId}/status`).set(ownerAuth).send({ active:false })).status).toBe(403)
    } finally {
      if (userId) { db.prepare('DELETE FROM audit_log WHERE target_id=? OR actor_user_id=?').run(userId,userId);db.prepare('DELETE FROM users WHERE id=?').run(userId) }
    }
  })

  it('registra equipe, participante, resposta e pontuação', async () => {
    const app = createApp()
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@local', password: 'troque123' })
    const authorization = { Authorization: `Bearer ${login.body.token}` }
    const suffix = Date.now().toString()
    const teamId = `teste-equipe-${suffix}`
    const participantId = `teste-participante-${suffix}`
    const answerId = `teste-resposta-${suffix}`

    try {
      expect((await request(app).post('/api/teams').set(authorization).send({ id: teamId, name: `Equipe Teste ${suffix}`, categoryId: 'infantil' })).status).toBe(201)
      expect((await request(app).post('/api/participants').set(authorization).send({ id: participantId, name: `Participante Teste ${suffix}`, birthDate: '2015-01-01', teamId, status: 'titular', position: 0 })).status).toBe(201)
      expect((await request(app).post('/api/questions/current').set(authorization).send({ questionId: 1 })).status).toBe(200)
      expect((await request(app).post('/api/answers').set(authorization).send({ id: answerId, questionId: 1, participantId, correct: true, deviceId: 'teste' })).status).toBe(201)
      const results = await request(app).get('/api/results').set(authorization)
      expect(results.body.teams.find((team: any) => team.id === teamId).points).toBe(1)
    } finally {
      db.prepare('DELETE FROM answers WHERE id=?').run(answerId)
      db.prepare('DELETE FROM participants WHERE id=?').run(participantId)
      db.prepare('DELETE FROM teams WHERE id=?').run(teamId)
      db.prepare("UPDATE questions SET is_current=0,status='nao_respondida' WHERE id=1").run()
    }
  })
})
