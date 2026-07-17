<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../stores/app'
const store = useAppStore(); const name = ref(''); const accessCode = ref(''); const open = ref(false)
async function save() { if (!name.value.trim()) return; await store.save('/api/helpers', { name: name.value, accessCode: accessCode.value }); name.value=''; accessCode.value=''; open.value=false }
</script>
<template><section><div class="page-heading"><div><p class="eyebrow">Organização</p><h1>Auxiliares</h1><p>Cadastre as pessoas responsáveis pelas equipes.</p></div><button class="primary" @click="open=!open">+ Novo auxiliar</button></div>
  <form v-if="open" class="panel form-grid" @submit.prevent="save"><label>Nome completo<input v-model="name" required placeholder="Ex.: Maria Souza"></label><label>Código de acesso<input v-model="accessCode" placeholder="Opcional"></label><button class="primary">Salvar auxiliar</button></form>
  <div class="panel table-panel"><div class="table-toolbar"><strong>{{ store.data.helpers.length }} auxiliares</strong><input class="search" placeholder="Buscar auxiliar…"></div><div class="cards-list"><article v-for="helper in store.data.helpers" :key="helper.id" class="person-row"><span class="avatar">{{ helper.name.charAt(0) }}</span><div><strong>{{ helper.name }}</strong><small>Código: {{ helper.access_code || 'não definido' }}</small></div><span class="ok-label">Ativo</span></article><div v-if="!store.data.helpers.length" class="empty">Nenhum auxiliar cadastrado ainda.</div></div></div>
</section></template>
