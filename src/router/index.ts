import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/songs',
      name: 'Songs',
      component: () => import('@/views/Songs.vue'),
    },
    {
      path: '/albums',
      name: 'Albums',
      component: () => import('@/views/Albums.vue'),
    },
    {
      path: '/artists',
      name: 'Artists',
      component: () => import('@/views/Artists.vue'),
    },
    {
      path: '/history',
      name: 'History',
      component: () => import('@/views/History.vue'),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue'),
    },
    {
      path: '/stats',
      name: 'Stats',
      component: () => import('@/views/Stats.vue'),
    },
    {
      path: '/scrape',
      name: 'Scrape',
      component: () => import('@/views/Scrape.vue'),
    },
    {
      path: '/organize',
      name: 'Organize',
      component: () => import('@/views/Organize.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      redirect: '/',
    },
  ],
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.public) {
    if (authStore.isAuthenticated && to.name === 'Login') {
      return { name: 'Home' };
    }
    return true;
  }

  if (!authStore.isAuthenticated) {
    return { name: 'Login' };
  }

  return true;
});

export default router;
