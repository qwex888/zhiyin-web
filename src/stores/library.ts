import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Song, Album, Artist } from '@/types';
import { musicApi } from '@/api/music';

export const useLibraryStore = defineStore('library', () => {
  const songs = ref<Song[]>([]);
  const albums = ref<Album[]>([]);
  const artists = ref<Artist[]>([]);
  const totalSongs = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchSongs = async (params: { limit?: number; offset?: number } = {}) => {
    loading.value = true;
    try {
      const response = await musicApi.getSongs(params);
      songs.value = response.data.items;
      totalSongs.value = response.data.total;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const fetchAlbums = async (params: { limit?: number; offset?: number } = {}) => {
    loading.value = true;
    try {
      const response = await musicApi.getAlbums(params);
      albums.value = response.data.items;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };
  
  const fetchArtists = async (params: { limit?: number; offset?: number } = {}) => {
    loading.value = true;
    try {
      const response = await musicApi.getArtists(params);
      artists.value = response.data.items;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const getArtistName = (id: number) => {
    return artists.value.find(a => a.id === id)?.name;
  };

  const getAlbumName = (id: number) => {
    return albums.value.find(a => a.id === id)?.name;
  };

  return {
    songs,
    albums,
    artists,
    totalSongs,
    loading,
    error,
    fetchSongs,
    fetchAlbums,
    fetchArtists,
    getArtistName,
    getAlbumName
  };
});
