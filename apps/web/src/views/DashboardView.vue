<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
const store = useAppStore()
const answered = computed(() => store.data.questions.filter((q) => q.status === 'respondida').length)
const cards = computed(() => [
  { label: 'Equipes', value: store.data.teams.length, icon: '♟', to: '/equipes', color: 'green' },
  { label: 'Participantes', value: store.data.participants.length, icon: '♙', to: '/equipes', color: 'gold' },
  { label: 'Perguntas respondidas', value: `${answered.value}/150`, icon: '?', to: '/painel', color: 'blue' },
  { label: 'Auxiliares', value: store.data.helpers.length, icon: '✦', to: '/auxiliares', color: 'rose' }
])
const formatDate = (value: string) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Ainda não sincronizado'
</script>

<template>
  <section>
    <div class="page-heading"><div><p class="eyebrow">Visão geral</p><h1>Olá, {{ store.user?.name }}</h1><p>Acompanhe a Copa Bíblica de forma simples e segura.</p></div><button class="secondary" @click="store.synchronize" :disabled="store.syncing">↻ Sincronizar agora</button></div>
    <div class="metric-grid"><router-link v-for="card in cards" :key="card.label" :to="card.to" class="metric-card" :class="card.color"><span>{{ card.icon }}</span><strong>{{ card.value }}</strong><small>{{ card.label }}</small></router-link></div>
    <div class="dashboard-grid">
      <article class="panel current-card"><p class="eyebrow">Agora</p><h2 v-if="store.currentQuestion">Pergunta {{ store.currentQuestion.id }}</h2><h2 v-else>Respostas bloqueadas</h2><p>{{ store.currentQuestion ? 'Os auxiliares já podem registrar as respostas.' : 'Escolha uma pergunta no Painel Geral para começar.' }}</p><router-link class="primary inline" to="/painel">Abrir painel</router-link></article>
      <article class="panel sync-card"><div class="panel-title"><h2>Segurança dos dados</h2><span class="status-badge" :class="{ warn: store.pending }">{{ store.pending ? `${store.pending} pendente(s)` : 'Protegido' }}</span></div><dl><div><dt>Conexão</dt><dd>{{ store.online ? 'Online' : 'Offline — dados salvos neste aparelho' }}</dd></div><div><dt>Última sincronização</dt><dd>{{ formatDate(store.lastSync) }}</dd></div><div><dt>Dispositivo</dt><dd>Este navegador está registrado</dd></div></dl></article>
    </div>
  </section>
</template>
