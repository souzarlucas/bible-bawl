import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './views/LoginView.vue'
import DashboardView from './views/DashboardView.vue'
import HelpersView from './views/HelpersView.vue'
import TeamsView from './views/TeamsView.vue'
import CompetitionView from './views/CompetitionView.vue'
import PanelView from './views/PanelView.vue'
import ResultsView from './views/ResultsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/', component: DashboardView },
    { path: '/auxiliares', component: HelpersView },
    { path: '/equipes', component: TeamsView },
    { path: '/copa', component: CompetitionView },
    { path: '/painel', component: PanelView },
    { path: '/resultados', component: ResultsView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('bible-token')
  if (!to.meta.public && !token) return '/login'
  if (to.path === '/login' && token) return '/'
})
