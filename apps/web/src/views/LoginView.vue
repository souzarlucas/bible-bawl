<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'

const email = ref('admin@local'); const password = ref(''); const error = ref(''); const loading = ref(false)
const localDevelopment = import.meta.env.DEV
const store = useAppStore(); const router = useRouter()
async function submit() {
  loading.value = true; error.value = ''
  try { await store.login(email.value, password.value); router.push('/') }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível entrar.' }
  finally { loading.value = false }
}
</script>

<template>
  <main class="login-page">
    <section class="login-story">
      <div class="cross">✝</div>
      <p class="eyebrow">Conhecimento que une</p>
      <h1>Copa Bíblica,<br><em>em todo lugar.</em></h1>
      <p>Organize equipes, acompanhe respostas e celebre o aprendizado — com ou sem internet.</p>
      <div class="feature-row"><span>✓ Offline</span><span>✓ Sincronizado</span><span>✓ Qualquer dispositivo</span></div>
    </section>
    <section class="login-card">
      <div class="mobile-logo">✝</div>
      <p class="eyebrow">Bem-vindo</p><h2>Entrar no sistema</h2>
      <p class="muted">Use sua conta para continuar.</p>
      <form @submit.prevent="submit">
        <label>E-mail<input v-model="email" type="email" autocomplete="username" required></label>
        <label>Senha<input v-model="password" type="password" autocomplete="current-password" required></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary wide" :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</button>
      </form>
      <p v-if="localDevelopment" class="demo-note">Ambiente local de desenvolvimento: <strong>admin@local</strong> / <strong>troque123</strong></p>
      <p v-else class="demo-note">Use a conta individual fornecida pelo administrador principal.</p>
    </section>
  </main>
</template>
