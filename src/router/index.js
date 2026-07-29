import { createRouter, createWebHistory } from 'vue-router'
import SettingsView from '../views/SettingsView.vue'
import TSView from '../views/TSView.vue'
import WorkView from '../views/WorkView.vue'
import StudyView from '../views/StudyView.vue'

const routes = [
  { path: '/', redirect: '/ts' },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/ts', name: 'ts', component: TSView },
  { path: '/work', name: 'work', component: WorkView },
  { path: '/study', name: 'study', component: StudyView }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
