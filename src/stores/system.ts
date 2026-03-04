import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSystemStore = defineStore('system', () => {
  const isConnected = ref(false);
  const lastCheck = ref<number | null>(null);

  const setConnected = (status: boolean) => {
    isConnected.value = status;
    lastCheck.value = Date.now();
  };

  return {
    isConnected,
    lastCheck,
    setConnected
  };
});
