<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'
import { participantPoints, teamPoints } from '../scoring'
const store=useAppStore(); const mode=ref<'teams'|'individual'>('teams'); const category=ref('all')
const teamResults=computed(()=>store.data.teams.map(team=>({id:team.id,name:team.name,category:team.category_id,points:teamPoints(team.id,store.data.teams,store.data.participants,store.data.answers)})).filter(x=>category.value==='all'||x.category===category.value).sort((a,b)=>b.points-a.points))
const individualResults=computed(()=>store.data.participants.map(p=>({id:p.id,name:p.name,team:store.data.teams.find(t=>t.id===p.team_id)?.name||'',category:store.data.teams.find(t=>t.id===p.team_id)?.category_id||'',points:participantPoints(p.id,store.data.answers)})).filter(x=>category.value==='all'||x.category===category.value).sort((a,b)=>b.points-a.points))
</script>
<template><section><div class="page-heading"><div><p class="eyebrow">Classificação</p><h1>Resultados</h1><p>Pontuação atualizada a partir das respostas sincronizadas.</p></div></div><div class="filters"><div class="tabs"><button :class="{active:mode==='teams'}" @click="mode='teams'">Por equipe</button><button :class="{active:mode==='individual'}" @click="mode='individual'">Individual</button></div><select v-model="category"><option value="all">Todas as categorias</option><option v-for="c in store.data.categories" :value="c.id">{{c.name}}</option></select></div>
  <div class="panel ranking"><div class="ranking-head"><span>Posição</span><span>Nome</span><span>Pontos</span></div><div v-for="(item,index) in mode==='teams'?teamResults:individualResults" :key="item.id" class="ranking-row"><span class="place" :class="`p${index+1}`">{{index+1}}</span><div><strong>{{item.name}}</strong><small>{{'team' in item?item.team:store.data.categories.find(c=>c.id===item.category)?.name}}</small></div><strong class="points">{{item.points}}</strong></div><div v-if="!(mode==='teams'?teamResults:individualResults).length" class="empty">Os resultados aparecerão depois das inscrições e respostas.</div></div>
</section></template>
