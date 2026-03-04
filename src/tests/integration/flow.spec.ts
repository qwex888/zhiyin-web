import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { musicApi } from '@/api/music';
import type { Song } from '@/types';

// Mock API
vi.mock('@/api/music', () => ({
  musicApi: {
    getSongs: vi.fn(),
    getAlbums: vi.fn(),
    getArtists: vi.fn(),
    getStreamToken: vi.fn(() => Promise.resolve({ data: { stream_token: 'test-token', expires_in: 60 } })),
    buildStreamUrl: vi.fn((id: number, quality: string, token: string) => `/api/stream/${id}?quality=${quality}&stoken=${token}`),
  }
}));

// Mock Howler
vi.mock('howler', () => {
  return {
    Howl: class {
      constructor() {
        return {
          play: vi.fn(),
          pause: vi.fn(),
          unload: vi.fn(),
          duration: vi.fn(() => 200),
          seek: vi.fn(() => 10),
          on: vi.fn(),
        };
      }
    },
    Howler: {
      volume: vi.fn(),
    }
  };
});

describe('Integration Flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Library Store', () => {
    it('fetchSongs updates state correctly', async () => {
      const store = useLibraryStore();
      const mockSongs: Song[] = [
          { id: 1, title: 'Test Song', artist_id: 10, album_id: 20, duration_secs: 180, file_path: 'path' }
      ];
      (musicApi.getSongs as any).mockResolvedValue({ 
        data: { 
          items: mockSongs, 
          total: 1, 
          limit: 10, 
          offset: 0, 
          has_next: false 
        } 
      });

      await store.fetchSongs();

      expect(store.songs).toEqual(mockSongs);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    });

    it('fetchSongs handles error', async () => {
      const store = useLibraryStore();
      (musicApi.getSongs as any).mockRejectedValue(new Error('Network Error'));

      await store.fetchSongs();

      expect(store.songs).toEqual([]);
      expect(store.error).toBe('Network Error');
    });
  });

  describe('Player Store', () => {
    it('play updates current song and queue', async () => {
      const store = usePlayerStore();
      const song: Song = { id: 1, title: 'Song 1', file_path: 'p1', duration_secs: 180, artist_id: 1, album_id: 1 };
      
      await store.play(song);

      expect(store.currentSong).toEqual(song);
      expect(store.queue).toContainEqual(song);
      expect(musicApi.getStreamToken).toHaveBeenCalledWith(1, 'original');
    });

    it('addToQueue adds song', () => {
      const store = usePlayerStore();
      const song: Song = { id: 2, title: 'Song 2', file_path: 'p2', duration_secs: 200, artist_id: 2, album_id: 2 };
      
      store.addToQueue(song);
      expect(store.queue).toHaveLength(1);
      expect(store.queue[0]).toEqual(song);
    });
  });
});
