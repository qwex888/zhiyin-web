import api from './index';
import type { Song, Album, Artist, Recommendation, PaginatedResponse } from '@/types';

interface StreamTokenResponse {
  stream_token: string;
  expires_in: number;
}

export const musicApi = {
  getSongs: (params: { limit?: number; offset?: number } = {}) => {
    return api.get<PaginatedResponse<Song>>('/songs', { params });
  },
  getSong: (id: number) => {
    return api.get<Song>(`/songs/${id}`);
  },
  getAlbums: (params: { limit?: number; offset?: number } = {}) => {
    return api.get<PaginatedResponse<Album>>('/albums', { params });
  },
  getArtists: (params: { limit?: number; offset?: number } = {}) => {
    return api.get<PaginatedResponse<Artist>>('/artists', { params });
  },
  getBatchSongs: (ids: number[]) => {
    return api.post<Song[]>('/songs/batch', { ids });
  },
  getRecommendations: () => {
    return api.get<Recommendation[]>('/recommend');
  },
  getStreamToken: (songId: number, quality: 'low' | 'medium' | 'high' | 'lossless' | 'original' = 'high') => {
    return api.post<StreamTokenResponse>('/stream-token', { song_id: songId, quality });
  },
  buildStreamUrl: (id: number, quality: string, streamToken: string) => {
    return `/api/stream/${id}?quality=${quality}&stoken=${streamToken}`;
  },
  getCoverUrl: (id: number) => {
    return `/api/covers/${id}?size=original`;
  },
  getLyrics: (id: number) => {
    return api.get<{ has_lyrics: boolean; lyrics: string; song_id: number }>(`/songs/${id}/lyrics`);
  },
  checkLyrics: (id: number) => {
    return api.get<{ has_lyrics: boolean; song_id: number }>(`/songs/${id}/lyrics/check`);
  },
};
