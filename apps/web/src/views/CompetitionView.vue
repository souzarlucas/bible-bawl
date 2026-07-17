<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'
const store=useAppStore(); const selectedTeam=ref('');
const participants=computed(()=>store.data.participants.filter(p=>p.team_id===selectedTeam.value))
function answer(participantId:string, correct:boolean){ if(!store.currentQuestion)return; store.save('/api/answers',{questionId:store.currentQuestion.id,participantId,correct}) }
function existing(id:string){return store.data.answers.find(a=>a.question_id===store.currentQuestion?.id&&a.participant_id===id)}
</script>
<template><section><div class="page-heading"><div><p class="eyebrow">Área do auxiliar</p><h1>Responder perguntas</h1><p>Registre a resposta de cada participante, mesmo sem internet.</p></div></div>
  <div v-if="!store.currentQuestion" class="panel blocked"><span>⏸</span><h2>Respostas bloqueadas</h2><p>Aguarde o apresentador liberar uma pergunta.</p></div>
  <template v-else><div class="question-hero"><p>Pergunta atual</p><strong>{{store.currentQuestion.id}}</strong><span>{{store.online?'Conectado':'Modo offline'}}</span></div><label class="team-select">Escolha a equipe<select v-model="selectedTeam"><option value="">Selecione…</option><option v-for="team in store.data.teams" :value="team.id">{{team.name}}</option></select></label><div class="answer-grid"><article v-for="p in participants" :key="p.id" class="answer-card"><span class="avatar large">{{p.position+1}}</span><div><h3>{{p.name}}</h3><small>{{p.status}}</small></div><div class="answer-buttons"><button :class="{selected:existing(p.id)?.correct===1}" @click="answer(p.id,true)">✓ Acertou</button><button class="wrong" :class="{selected:existing(p.id)?.correct===0}" @click="answer(p.id,false)">× Errou</button></div></article></div></template>
</section></template>
