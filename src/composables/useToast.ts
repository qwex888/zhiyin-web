import { ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

// Global state
const toasts = ref<Toast[]>([]);
let nextId = 1;

export function useToast() {
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const id = nextId++;
    const toast: Toast = { id, message, type, duration };
    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const success = (message: string, duration = 3000) => showToast(message, 'success', duration);
  const error = (message: string, duration = 3000) => showToast(message, 'error', duration);
  const info = (message: string, duration = 3000) => showToast(message, 'info', duration);

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  };

  return {
    toasts,
    showToast,
    success,
    error,
    info,
    removeToast
  };
}
