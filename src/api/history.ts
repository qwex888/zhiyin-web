import api from './index';
import type { RecentSong, PlayHistory, HistoryStats, PaginatedResponse } from '@/types';
export const historyApi = {
  getHistory: (params: { limit?: number; offset?: number } = {}) => {
    return api.get<PaginatedResponse<PlayHistory>>('/history', { params });
  },
  getRecentSongs: () => {
    return api.get<RecentSong[]>('/history/recent');
  },
  getSongHistory: (id: number) => {
    return api.get<PlayHistory[]>(`/history/song/${id}`);
  },
  getStats: () => {
    return api.get<HistoryStats>('/history/stats');
  },
};
