<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '../stores/app'
import type { AuditEntry, ManagedUser, Role } from '../types'

const store=useAppStore(); const users=ref<ManagedUser[]>([]); const audit=ref<AuditEntry[]>([])
const name=ref(''); const email=ref(''); const role=ref<Role>('auxiliar'); const password=ref(''); const confirmation=ref('')
const loading=ref(false); const error=ref(''); const resetTarget=ref<ManagedUser|null>(null); const resetPassword=ref('')
const roleLabels:Record<Role,string>={ admin:'Administrador',apresentador:'Apresentador',auxiliar:'Auxiliar' }
const actionLabels:Record<string,string>={ login:'Entrou no sistema',user_created:'Criou uma conta',user_blocked:'Bloqueou uma conta',user_activated:'Reativou uma conta',password_reset:'Redefiniu uma senha',password_changed:'Alterou a própria senha',helper_saved:'Salvou um auxiliar',team_saved:'Salvou uma equipe',participant_saved:'Salvou um participante',question_opened:'Liberou uma pergunta',answers_blocked:'Bloqueou as respostas',answer_saved:'Registrou uma resposta' }
const activeCount=computed(()=>users.value.filter(user=>user.active).length)
const formatDate=(value?:string|null)=>value ? new Intl.DateTimeFormat('pt-BR',{ dateStyle:'short',timeStyle:'short' }).format(new Date(value)) : 'Nunca'

async function load() {
  loading.value=true; error.value=''
  try {
    const [userResult,auditResult]=await Promise.all([store.request('/api/users'),store.request('/api/audit?limit=80')])
    users.value=userResult.users; audit.value=auditResult.entries
  } catch (cause) { error.value=cause instanceof Error ? cause.message : 'Não foi possível carregar os acessos.' }
  finally { loading.value=false }
}
async function createUser() {
  error.value=''
  if (password.value!==confirmation.value) { error.value='A confirmação da senha está diferente.'; return }
  try {
    await store.request('/api/users',{ method:'POST',body:JSON.stringify({ name:name.value,email:email.value,role:role.value,password:password.value }) })
    name.value='';email.value='';role.value='auxiliar';password.value='';confirmation.value='';store.message='Conta criada. Entregue a senha diretamente para essa pessoa.';await load()
  } catch (cause) { error.value=cause instanceof Error ? cause.message : 'Não foi possível criar a conta.' }
}
async function toggle(user:ManagedUser) {
  const action=user.active ? 'bloquear' : 'reativar'
  if (!window.confirm(`Deseja ${action} a conta de ${user.name}?`)) return
  try { await store.request(`/api/users/${user.id}/status`,{ method:'POST',body:JSON.stringify({ active:!user.active }) });await load() }
  catch (cause) { error.value=cause instanceof Error ? cause.message : 'Não foi possível alterar a conta.' }
}
async function reset() {
  if (!resetTarget.value) return
  try {
    await store.request(`/api/users/${resetTarget.value.id}/password`,{ method:'POST',body:JSON.stringify({ password:resetPassword.value }) })
    resetTarget.value=null;resetPassword.value='';store.message='Senha redefinida. Informe a nova senha diretamente ao colaborador.';await load()
  } catch (cause) { error.value=cause instanceof Error ? cause.message : 'Não foi possível redefinir a senha.' }
}
</script>

<template><section>
  <div class="page-heading"><div><p class="eyebrow">Segurança e equipe</p><h1>Contas de acesso</h1><p>Cada colaborador entra com sua própria conta. Sua senha principal nunca precisa ser compartilhada.</p></div><span class="status-badge">{{activeCount}} ativas</span></div>
  <p v-if="error" class="error panel-error">{{error}}</p>
  <div class="access-layout">
    <form class="panel form-stack access-form" @submit.prevent="createUser"><div><p class="eyebrow">Novo colaborador</p><h2>Criar conta individual</h2></div>
      <label>Nome completo<input v-model="name" minlength="2" required autocomplete="off"></label>
      <label>E-mail<input v-model="email" type="email" required autocomplete="off"></label>
      <label>Perfil<select v-model="role"><option v-if="store.user?.isPrimary" value="admin">Administrador</option><option value="apresentador">Apresentador</option><option value="auxiliar">Auxiliar</option></select></label>
      <div class="permission-note"><strong>{{roleLabels[role]}}</strong><span v-if="role==='admin'">Pode configurar o jogo e gerenciar colaboradores. Somente você pode criar este perfil.</span><span v-else-if="role==='apresentador'">Pode controlar perguntas e acompanhar resultados.</span><span v-else>Pode registrar respostas e acompanhar resultados.</span></div>
      <label>Senha inicial<input v-model="password" type="password" minlength="10" required autocomplete="new-password"><small>Mínimo de 10 caracteres.</small></label>
      <label>Confirmar senha<input v-model="confirmation" type="password" minlength="10" required autocomplete="new-password"></label>
      <button class="primary wide">Criar conta</button>
    </form>
    <div class="panel table-panel access-list"><div class="panel-title"><div><p class="eyebrow">Pessoas autorizadas</p><h2>{{users.length}} contas</h2></div><button class="secondary" @click="load" :disabled="loading">↻ Atualizar</button></div>
      <div class="cards-list"><article v-for="user in users" :key="user.id" class="person-row account-row" :class="{inactive:!user.active}"><span class="avatar">{{user.name.charAt(0)}}</span><div class="account-info"><strong>{{user.name}} <em v-if="user.is_primary" class="primary-owner">Principal</em></strong><small>{{user.email}} · {{roleLabels[user.role]}}</small><small>Último acesso: {{formatDate(user.last_login_at)}}</small></div><span class="status-badge" :class="{warn:!user.active}">{{user.active?'Ativa':'Bloqueada'}}</span><div v-if="!user.is_primary && user.id!==store.user?.userId && (user.role!=='admin'||store.user?.isPrimary)" class="account-actions"><button class="secondary" @click="resetTarget=user">Nova senha</button><button :class="user.active?'danger':'secondary'" @click="toggle(user)">{{user.active?'Bloquear':'Reativar'}}</button></div></article></div>
    </div>
  </div>
  <article class="panel audit-panel"><div class="panel-title"><div><p class="eyebrow">Histórico</p><h2>Atividades recentes</h2></div><small>Até 80 registros mais recentes</small></div><div class="audit-list"><div v-for="entry in audit" :key="entry.id" class="audit-row"><span class="status-dot"></span><div><strong>{{entry.actor_name}}</strong> {{actionLabels[entry.action]||entry.action}}<small>{{formatDate(entry.created_at)}}</small></div></div><div v-if="!audit.length" class="empty">Nenhuma atividade registrada ainda.</div></div></article>
  <div v-if="resetTarget" class="modal-backdrop" @click.self="resetTarget=null"><form class="modal form-stack" @submit.prevent="reset"><button type="button" class="close" @click="resetTarget=null">×</button><p class="eyebrow">Redefinir acesso</p><h2>Nova senha para {{resetTarget.name}}</h2><p>Essa alteração não mostra nem recupera a senha anterior.</p><label>Nova senha<input v-model="resetPassword" type="password" minlength="10" required autocomplete="new-password"><small>Mínimo de 10 caracteres.</small></label><button class="primary wide">Salvar nova senha</button></form></div>
</section></template>
