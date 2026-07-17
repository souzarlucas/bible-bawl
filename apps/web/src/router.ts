import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './views/LoginView.vue'
import DashboardView from './views/DashboardView.vue'
import HelpersView from './views/HelpersView.vue'
import TeamsView from './views/TeamsView.vue'
import CompetitionView from './views/CompetitionView.vue'
import PanelView from './views/PanelView.vue'
import ResultsView from './views/ResultsView.vue'
import UsersView from './views/UsersView.vue'
import ProfileView from './views/ProfileView.vue'
import type { Role, User } from './types'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/', component: DashboardView },
    { path: '/auxiliares', component: HelpersView, meta: { roles:['admin'] } },
    { path: '/equipes', component: TeamsView, meta: { roles:['admin'] } },
    { path: '/copa', component: CompetitionView },
    { path: '/painel', component: PanelView, meta: { roles:['admin','apresentador'] } },
    { path: '/resultados', component: ResultsView },
    { path: '/contas', component: UsersView, meta: { roles:['admin'] } },
    { path: '/minha-conta', component: ProfileView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('bible-token')
  const user:User|null=JSON.parse(localStorage.getItem('bible-user') || 'null')
  if (!to.meta.public && !token) return '/login'
  if (to.path === '/login' && token) return '/'
  const roles=to.meta.roles as Role[]|undefined
  if (roles && (!user || !roles.includes(user.role))) return '/'
})
