import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AuthUser } from '@/api/auth';

const STORE_KEY = 'auth';

export const useAuthStore = defineStore(STORE_KEY, () => {
  const token = ref<string | null>(null);
  const user = ref<AuthUser | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  const setAuth = (loginToken: string, loginUser: AuthUser) => {
    token.value = loginToken;
    user.value = loginUser;
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      // localStorage 不可用时忽略
    }
  };

  return {
    token,
    user,
    isAuthenticated,
    setAuth,
    logout,
  };
}, {
  persist: {
    pick: ['token', 'user'],
  },
});
