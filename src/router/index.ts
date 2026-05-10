import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'recipe-list',
      component: () => import('@/views/RecipeList.vue')
    },
    {
      path: '/recipe/new',
      name: 'recipe-new',
      component: () => import('@/views/RecipeEditor.vue')
    },
    {
      path: '/recipe/:id/edit',
      name: 'recipe-edit',
      component: () => import('@/views/RecipeEditor.vue')
    },
    {
      path: '/recipe/:id/run',
      name: 'recipe-run',
      component: () => import('@/views/TimerRun.vue')
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue')
    }
  ]
})

export default router
