<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'
const store=useAppStore(); const chosen=ref(store.currentQuestion?.id||1)
const answerCount=computed(()=>store.data.answers.filter(a=>a.question_id===store.currentQuestion?.id).length)
function setQuestion(id:number){chosen.value=Math.max(1,Math.min(150,id));store.save('/api/questions/current',{questionId:chosen.value})}
function block(){store.save('/api/questions/current',{questionId:0})}
</script>
<template><section><div class="page-heading"><div><p class="eyebrow">Apresentação</p><h1>Painel geral</h1><p>Controle a pergunta liberada para todos os auxiliares.</p></div><router-link class="secondary" to="/resultados">Ver resultados</router-link></div>
  <div class="panel-control"><article class="question-stage"><p>Pergunta liberada</p><strong>{{store.currentQuestion?.id||'—'}}</strong><span>{{answerCount}} respostas recebidas</span></article><article class="panel controls"><h2>Controle da rodada</h2><div class="stepper"><button @click="setQuestion((store.currentQuestion?.id||1)-1)">←</button><input v-model.number="chosen" type="number" min="1" max="150"><button @click="setQuestion((store.currentQuestion?.id||0)+1)">→</button></div><button class="primary wide" @click="setQuestion(chosen)">Liberar pergunta {{chosen}}</button><button class="danger wide" @click="block">Bloquear respostas</button></article></div>
  <div class="question-progress panel"><div class="panel-title"><h2>Progresso das perguntas</h2><strong>{{store.data.questions.filter(q=>q.status==='respondida').length}} de 150</strong></div><div class="progress"><i :style="{width:`${store.data.questions.filter(q=>q.status==='respondida').length/1.5}%`}"></i></div></div>
</section></template>
