import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AuthUser } from '@/api/auth';
import { authApi } from '@/api/auth';

const STORE_KEY = 'auth';

export const useAuthStore = defineStore(STORE_KEY, () => {
  const token = ref<string | null>(null);
  const user = ref<AuthUser | null>(null);
  const initialized = ref<boolean | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

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

  const checkInitStatus = async (): Promise<boolean> => {
    try {
      const { data } = await authApi.getStatus();
      initialized.value = data.initialized;
      return data.initialized;
    } catch {
      initialized.value = null;
      return false;
    }
  };

  return {
    token,
    user,
    initialized,
    isAuthenticated,
    isAdmin,
    setAuth,
    logout,
    checkInitStatus,
  };
}, {
  persist: {
    pick: ['token', 'user'],
  },
});
