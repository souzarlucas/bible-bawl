import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { localDb, readSnapshot, saveSnapshot } from '../db'
import type { QueuedOperation, Snapshot, User } from '../types'

const emptySnapshot = (): Snapshot => ({ categories: [], helpers: [], teams: [], participants: [], questions: [], answers: [], version: 0 })
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const deviceId = localStorage.getItem('bible-device-id') || crypto.randomUUID()
localStorage.setItem('bible-device-id', deviceId)

export const useAppStore = defineStore('app', () => {
  const token = ref(localStorage.getItem('bible-token') || '')
  const user = ref<User | null>(JSON.parse(localStorage.getItem('bible-user') || 'null'))
  const data = ref<Snapshot>(emptySnapshot())
  const online = ref(navigator.onLine)
  const syncing = ref(false)
  const pending = ref(0)
  const lastSync = ref(localStorage.getItem('bible-last-sync') || '')
  const message = ref('')
  const currentQuestion = computed(() => data.value.questions.find((q) => q.is_current === 1))

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}), ...init.headers }
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status===401 || body.code==='ACCOUNT_BLOCKED' || body.code==='SESSION_REVOKED') {
        logout()
        if (window.location.pathname!=='/login') window.location.assign('/login')
      }
      throw new Error(body.message || 'Não foi possível concluir a operação.')
    }
    return body
  }

  async function request(path: string, init: RequestInit = {}) { return api(path,init) }

  async function login(email: string, password: string) {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    token.value = result.token; user.value = result.user
    localStorage.setItem('bible-token', result.token); localStorage.setItem('bible-user', JSON.stringify(result.user))
    await synchronize()
  }

  function logout() {
    token.value = ''; user.value = null
    localStorage.removeItem('bible-token'); localStorage.removeItem('bible-user')
  }

  async function initialize() {
    const cached = await readSnapshot()
    if (cached) data.value = cached
    pending.value = await localDb.operations.count()
    if (token.value && navigator.onLine) await synchronize().catch(() => undefined)
  }

  function applyLocal(endpoint: string, body: Record<string, any>) {
    const updated_at = new Date().toISOString()
    if (endpoint === '/api/helpers') {
      const item = { id: body.id, name: body.name, access_code: body.accessCode || null, updated_at }
      data.value.helpers = [...data.value.helpers.filter((x) => x.id !== item.id), item].sort((a,b) => a.name.localeCompare(b.name))
    } else if (endpoint === '/api/teams') {
      const item = { id: body.id, name: body.name, category_id: body.categoryId, helper_id: body.helperId || null, updated_at }
      data.value.teams = [...data.value.teams.filter((x) => x.id !== item.id), item].sort((a,b) => a.name.localeCompare(b.name))
    } else if (endpoint === '/api/participants') {
      const item = { id: body.id, name: body.name, birth_date: body.birthDate, team_id: body.teamId, status: body.status, position: body.position, updated_at }
      data.value.participants = [...data.value.participants.filter((x) => x.id !== item.id), item]
    } else if (endpoint === '/api/questions/current') {
      data.value.questions = data.value.questions.map((q) => ({ ...q, is_current: q.id === body.questionId ? 1 : 0 }))
    } else if (endpoint === '/api/answers') {
      const item = { id: body.id, question_id: body.questionId, participant_id: body.participantId, correct: body.correct ? 1 : 0, device_id: body.deviceId, updated_at }
      data.value.answers = [...data.value.answers.filter((x) => !(x.question_id === item.question_id && x.participant_id === item.participant_id)), item]
    }
    saveSnapshot(data.value)
  }

  async function save(endpoint: string, body: Record<string, any>) {
    body.id ||= crypto.randomUUID()
    if (endpoint === '/api/answers') body.deviceId ||= deviceId
    const operation: QueuedOperation = { id: crypto.randomUUID(), endpoint, body, createdAt: new Date().toISOString() }
    applyLocal(endpoint, body)
    await localDb.operations.put(operation); pending.value = await localDb.operations.count()
    message.value = online.value ? 'Salvo. Sincronizando…' : 'Salvo neste aparelho. Será sincronizado quando a internet voltar.'
    if (online.value) await synchronize()
    return body.id
  }

  async function synchronize() {
    if (!token.value || !navigator.onLine || syncing.value) return
    syncing.value = true; online.value = true
    try {
      const queued = await localDb.operations.orderBy('createdAt').toArray()
      for (const operation of queued) {
        try {
          await api(operation.endpoint, { method: 'POST', body: JSON.stringify(operation.body) })
          await localDb.operations.delete(operation.id)
        } catch (error) {
          await localDb.operations.update(operation.id, { error: error instanceof Error ? error.message : 'Erro' })
          throw error
        }
      }
      data.value = await api('/api/sync')
      await saveSnapshot(data.value)
      lastSync.value = new Date().toISOString(); localStorage.setItem('bible-last-sync', lastSync.value)
      pending.value = await localDb.operations.count(); message.value = 'Tudo sincronizado.'
    } finally { syncing.value = false }
  }

  function setOnline(value: boolean) {
    online.value = value
    if (value) synchronize().catch((error) => { message.value = error.message })
  }

  async function changePassword(currentPassword:string,newPassword:string) {
    await api('/api/auth/change-password',{ method:'POST',body:JSON.stringify({ currentPassword,newPassword }) })
    logout()
  }

  return { token, user, data, online, syncing, pending, lastSync, message, currentQuestion, login, logout, initialize, save, synchronize, setOnline, request, changePassword }
})
