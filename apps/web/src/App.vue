<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from './stores/app'

const store = useAppStore(); const route = useRoute(); const router = useRouter()
const links = computed(() => {
  const common=[['/', '⌂', 'Início'],['/copa', '✦', 'Responder'],['/resultados', '≡', 'Resultados']]
  if (store.user?.role==='admin') return [common[0],['/auxiliares','♙','Auxiliares'],['/equipes','♟','Equipes'],common[1],['/painel','▣','Painel'],common[2],['/contas','⚿','Acessos']]
  if (store.user?.role==='apresentador') return [common[0],common[1],['/painel','▣','Painel'],common[2]]
  return common
})
onMounted(() => {
  store.initialize()
  window.addEventListener('online', () => store.setOnline(true))
  window.addEventListener('offline', () => store.setOnline(false))
})
function leave() { store.logout(); router.push('/login') }
</script>

<template>
  <router-view v-if="route.path === '/login'" />
  <div v-else class="shell">
    <header class="topbar">
      <router-link to="/" class="brand"><span class="brand-mark">✝</span><span>Bible Bawl<small>Copa Bíblica</small></span></router-link>
      <div class="sync-pill" :class="{ offline: !store.online }">
        <span class="status-dot"></span>{{ store.online ? (store.syncing ? 'Sincronizando' : 'Online') : 'Offline' }}
        <strong v-if="store.pending">{{ store.pending }}</strong>
      </div>
      <router-link class="user-button" to="/minha-conta" :title="`Minha conta: ${store.user?.name}`">{{ store.user?.name?.charAt(0) || 'U' }}</router-link>
      <button class="logout-button" @click="leave">Sair</button>
    </header>
    <aside class="sidebar" aria-label="Menu principal">
      <router-link v-for="link in links" :key="link[0]" :to="link[0]" :title="link[2]"><span>{{ link[1] }}</span><em>{{ link[2] }}</em></router-link>
    </aside>
    <main class="content"><router-view /></main>
    <nav class="bottom-nav" aria-label="Menu para celular">
      <router-link v-for="link in links.slice(0,5)" :key="link[0]" :to="link[0]"><span>{{ link[1] }}</span><small>{{ link[2] }}</small></router-link>
    </nav>
    <div v-if="store.message" class="toast" @click="store.message = ''">{{ store.message }}</div>
  </div>
</template>
