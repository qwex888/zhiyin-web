
import api from './index';
import type { Stats } from '@/types';

export const statsApi = {
  getStats: () => {
    return api.get<Stats>('/stats');
  },
};
