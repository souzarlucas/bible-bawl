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
